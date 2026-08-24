#!/usr/bin/env node
/**
 * DSH 商店中文打标器（v1，借鉴 2BingLing/dsh-market collector/src/llm.ts，MIT）：
 * 手动/半自动运行——把 registry.json 的插件用 DeepSeek（OpenAI 兼容网关）增量
 * 打成中文功能标签 + 中文一句话简介，产物写 tags.json（独立文件，不碰 registry），
 * 提交回 dsh-market-index 仓库，所有 dsh-store 用户经 CDN 自动收到（无需商店升版本）。
 *
 * 用法：
 *   export DEEPSEEK_API_KEY=sk-xxx            # 你的 key（settings 里 llm-deepseek.apiKeyEnv 同名）
 *   node scripts/tag-zh.mjs --limit 100        # 试打 100 条（增量：只打缺的）
 *   node scripts/tag-zh.mjs                    # 全量增量
 *   node scripts/tag-zh.mjs --push             # 打完后 git 提交 + push（含 pull --rebase 防冲突）
 *   node scripts/tag-zh.mjs --dry-run          # 只统计待打数量，不发请求
 *   DSH_TAG_MODEL=deepseek/deepseek-v4-pro node scripts/tag-zh.mjs --limit 50
 *
 * 增量与缓存：zh-cache.json（随仓库提交，跨天累积）；README/简介大改（指纹变化）
 * 自动重翻；已知标签 top40 约束复用，抑制同义异名；宽泛标签黑名单剔除。
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const REGISTRY = join(ROOT, 'registry.json')
const TAGS_OUT = join(ROOT, 'tags.json')
const CACHE_FILE = join(ROOT, 'zh-cache.json')

const API_KEY = process.env.DEEPSEEK_API_KEY ?? ''
const BASE_URL = process.env.DSH_TAG_BASE_URL ?? 'https://api.llm.mioffice.cn/v1'
const MODEL = process.env.DSH_TAG_MODEL ?? 'deepseek/deepseek-v4-flash'
const CONCURRENCY = 5
const MAX_DESC = 220

const GENERIC_TAGS = new Set(['效率工具', '开发辅助', 'AI 增强', 'AI增强', '插件'])
const args = process.argv.slice(2)
const arg = (name) => {
  const i = args.indexOf('--' + name)
  return i >= 0 ? (args[i + 1] ?? 'true') : null
}
const limitN = arg('limit') !== null ? parseInt(arg('limit'), 10) : Infinity
const dryRun = args.includes('--dry-run')
const doPush = args.includes('--push')

function log(msg) { console.log('[tag-zh] ' + msg) }

function loadRegistry() {
  const data = JSON.parse(readFileSync(REGISTRY, 'utf8'))
  return Array.isArray(data.repos) ? data.repos : []
}

function loadCache() {
  if (!existsSync(CACHE_FILE)) return {}
  try { return JSON.parse(readFileSync(CACHE_FILE, 'utf8')) } catch { return {} }
}

function fingerprint(repo) {
  // 指纹=简介+README 长度+安装命令数：内容大改触发重翻，避免简介过时
  return [repo.description ?? '', repo.readme_len ?? 0, (repo.readme_cmds ?? []).length].join('|')
}

function buildPrompt(repo, knownTags) {
  const known = knownTags.length
    ? '已存在的细分标签（优先从中选用，只有确实无法表达时才创建新标签）：\n' + knownTags.slice(0, 40).join('、') + '\n'
    : ''
  return '你是 DeepSeek Harness 插件市场的编辑。为下面这个 DSH 插件生成中文简介和中文功能标签。\n\n' +
    '插件名：' + repo.name + '\n' +
    '英文描述：' + ((repo.description ?? '').slice(0, 200) || '（无）') + '\n' +
    'GitHub topics：' + ((repo.topics ?? []).join(', ') || '（无）') + '\n' +
    'README 长度：' + (repo.readme_len ?? 0) + ' 字符，安装命令示例：' + ((repo.readme_cmds ?? []).slice(0, 2).join(' ; ') || '无') + '\n' +
    known +
    '要求：\n' +
    '1. descriptionZh：一句话中文简介（不超过 60 字），突出「能做什么、有什么用」，口语化自然，不要翻译腔\n' +
    '2. tagsZh：3-5 个中文功能标签，用于分类筛选' + (known ? '，**优先复用上面已存在的标签**（用词一致），只有新功能类型才创建新标签' : '') + '\n\n' +
    '只输出 JSON，不要任何其他文字：\n{"descriptionZh": "...", "tagsZh": ["...", "..."]}'
}

function extractJson(raw) {
  try {
    const cleaned = String(raw).replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start < 0 || end <= start) return null
    const parsed = JSON.parse(cleaned.slice(start, end + 1))
    const descriptionZh = String(parsed.descriptionZh ?? '').trim().slice(0, 120)
    const tagsZh = Array.isArray(parsed.tagsZh)
      ? parsed.tagsZh.map((t) => String(t).trim()).filter(Boolean).filter((t) => !GENERIC_TAGS.has(t)).slice(0, 6)
      : []
    if (!descriptionZh && tagsZh.length === 0) return null
    return { descriptionZh, tagsZh }
  } catch { return null }
}

async function translateOne(repo, knownTags) {
  const body = {
    model: MODEL,
    messages: [{ role: 'user', content: buildPrompt(repo, knownTags) }],
    temperature: 0.3,
    max_tokens: 300,
  }
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(BASE_URL + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + API_KEY },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60_000),
      })
      if (!res.ok) {
        const err = (await res.text()).slice(0, 150)
        if (res.status !== 429 && res.status < 500) { log('HTTP ' + res.status + ' 不重试: ' + err); return null }
        throw new Error('HTTP ' + res.status + ': ' + err)
      }
      const data = await res.json()
      const content = data.choices?.[0]?.message?.content
      if (!content) return null
      const result = extractJson(content)
      if (!result) { log('bad JSON for ' + repo.full_name + ': ' + String(content).slice(0, 100)); return null }
      return result
    } catch (err) {
      if (attempt === 3) { log(repo.full_name + ' failed: ' + String(err.message).slice(0, 100)); return null }
      await new Promise((r) => setTimeout(r, 2000 * attempt))
    }
  }
  return null
}

async function main() {
  if (!dryRun && !API_KEY) {
    log('未设置 DEEPSEEK_API_KEY——请先 export（见文件头注释），或加 --dry-run 只统计。')
    process.exit(1)
  }
  const repos = loadRegistry()
  const cache = loadCache()
  const cacheEntries = cache.entries ?? {}
  // 已存在的细分标签清单（约束新翻译优先复用）
  const knownTags = [...new Set(
    Object.values(cacheEntries).flatMap((v) => v.tagsZh ?? []).filter((t) => /[\u4e00-\u9fff]/.test(t)),
  )].slice(0, 40)

  const todo = []
  for (const repo of repos) {
    const key = repo.full_name.toLowerCase()
    const cached = cacheEntries[key]
    const fp = fingerprint(repo)
    if (cached && cached.descriptionZh && cached.summaryKey === fp) continue // 未变：复用
    todo.push({ repo, key, fp, retranslate: cached?.descriptionZh ? true : false })
  }
  log('待打标：' + todo.length + ' 条（其中重翻 ' + todo.filter((t) => t.retranslate).length + '）')
  if (dryRun || todo.length === 0) return

  const batch = todo.slice(0, Math.max(0, limitN))
  log('本轮打标：' + batch.length + ' 条（并发 ' + CONCURRENCY + '）')
  let cursor = 0
  let ok = 0
  const worker = async () => {
    while (cursor < batch.length) {
      const item = batch[cursor++]
      const result = await translateOne(item.repo, knownTags)
      if (result) {
        cacheEntries[item.key] = { descriptionZh: result.descriptionZh, tagsZh: result.tagsZh, summaryKey: item.fp, at: new Date().toISOString().slice(0, 10) }
        ok++
        if (ok % 10 === 0) log('进度 ' + ok + '/' + batch.length + ' → ' + item.repo.full_name + ' ' + result.descriptionZh.slice(0, 30))
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  log('完成：成功 ' + ok + '/' + batch.length)

  // 产物：tags.json（独立文件；所有条目含中文标签/简介者进入）
  const entries = {}
  let count = 0
  for (const [key, v] of Object.entries(cacheEntries)) {
    if (!v.descriptionZh) continue
    entries[key] = { descriptionZh: v.descriptionZh, tagsZh: v.tagsZh }
    count++
  }
  writeFileSync(TAGS_OUT, JSON.stringify({ generatedAt: new Date().toISOString(), count, entries }, null, 1) + '\n')
  writeFileSync(CACHE_FILE, JSON.stringify({ generatedAt: new Date().toISOString(), entries: cacheEntries }, null, 1) + '\n')
  log('tags.json 已写：' + count + ' 条')

  if (doPush) {
    const { execSync } = await import('node:child_process')
    try {
      execSync('git add tags.json zh-cache.json', { cwd: ROOT, stdio: 'inherit' })
      execSync('git pull --rebase origin main', { cwd: ROOT, stdio: 'inherit' })
      execSync('git commit -m "tags: 手动打标 ' + ok + ' 条（' + new Date().toISOString().slice(0, 10) + '）"', { cwd: ROOT, stdio: 'inherit' })
      execSync('git push origin main', { cwd: ROOT, stdio: 'inherit' })
      log('已提交并推送——所有 dsh-store 用户将在下次刷新（≤24h 缓存）后收到新标签。')
    } catch (err) {
      log('push 失败（可稍后手动 git push）：' + String(err.message).slice(0, 150))
      process.exit(1)
    }
  } else {
    log('未加 --push：产物已落盘，确认无误后运行 node scripts/tag-zh.mjs --push 提交。')
  }
}

main().catch((err) => { console.error('[tag-zh] 失败：' + err.message); process.exit(1) })
