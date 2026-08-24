#!/usr/bin/env node
/**
 * DSH 商店多语言打标器（v2，借鉴 2BingLing/dsh-market llm.ts，MIT）：
 * 手动/半自动运行——把 registry.json 的插件用 DeepSeek（OpenAI 兼容网关）增量
 * 打成 **9 语言一句话简介（en/zh/ja/ko/es/fr/de/pt/ru）** + 中文/英文功能标签，
 * 产物写 tags.json（独立文件，不碰 registry），提交回 dsh-market-index 仓库，
 * 所有 dsh-store 用户经 CDN 自动收到（无需商店升版本）。
 *
 * 用法：
 *   node scripts/tag-i18n.mjs --dry-run        # 只统计待打数量
 *   node scripts/tag-i18n.mjs --limit 100      # 试打 100 条
 *   node scripts/tag-i18n.mjs                  # 全量增量
 *   node scripts/tag-i18n.mjs --push           # git 提交 + 推送（含 pull --rebase）
 *
 * API Key 自动探测顺序：环境变量 DEEPSEEK_API_KEY →
 * ~/.dsh/settings.yaml 里 llm-deepseek.apiKeyEnv 指向的环境变量；
 * baseURL/model 缺省取 settings.yaml 的 llm-deepseek 配置（可用 DSH_TAG_BASE_URL /
 * DSH_TAG_MODEL 覆盖）。
 *
 * 增量与缓存：zh-cache.json（跨天累积，随仓库提交）；指纹（简介+README长度+命令数）
 * 变化自动重翻；已知标签 top40 约束复用；宽泛标签黑名单剔除。
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const REGISTRY = join(ROOT, 'registry.json')
const TAGS_OUT = join(ROOT, 'tags.json')
const CACHE_FILE = join(ROOT, 'zh-cache.json')

const LANGS = ['en', 'zh', 'ja', 'ko', 'es', 'fr', 'de', 'pt', 'ru']
const CONCURRENCY = 5

const GENERIC_TAGS = new Set(['效率工具', '开发辅助', 'AI 增强', 'AI增强', '插件'])
const args = process.argv.slice(2)
const arg = (name) => {
  const i = args.indexOf('--' + name)
  return i >= 0 ? (args[i + 1] ?? 'true') : null
}
const limitN = arg('limit') !== null ? parseInt(arg('limit'), 10) : Infinity
const dryRun = args.includes('--dry-run')
const doPush = args.includes('--push')

function log(msg) { console.log('[tag-i18n] ' + msg) }

/** 从 ~/.dsh/settings.yaml 读取 llm-deepseek 配置（apiKeyEnv/baseURL/model）。 */
function loadSettings() {
  const file = join(homedir(), '.dsh', 'settings.yaml')
  try {
    const text = readFileSync(file, 'utf8')
    const pick = (key) => {
      const m = text.match(new RegExp('^\\s*' + key + '\\s*:\\s*(.+)$', 'm'))
      return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : null
    }
    return { apiKeyEnv: pick('apiKeyEnv'), baseURL: pick('baseURL'), model: pick('model') }
  } catch { return {} }
}

const settings = loadSettings()
const API_KEY = process.env.DEEPSEEK_API_KEY ?? (settings.apiKeyEnv ? (process.env[settings.apiKeyEnv] ?? '') : '')
const BASE_URL = process.env.DSH_TAG_BASE_URL ?? settings.baseURL ?? 'https://api.llm.mioffice.cn/v1'
const MODEL = process.env.DSH_TAG_MODEL ?? 'deepseek/deepseek-v4-flash'

function loadRegistry() {
  const data = JSON.parse(readFileSync(REGISTRY, 'utf8'))
  return Array.isArray(data.repos) ? data.repos : []
}

function loadCache() {
  if (!existsSync(CACHE_FILE)) return {}
  try { return JSON.parse(readFileSync(CACHE_FILE, 'utf8')) } catch { return {} }
}

function fingerprint(repo) {
  return [repo.description ?? '', repo.readme_len ?? 0, (repo.readme_cmds ?? []).length].join('|')
}

function buildPrompt(repo, knownTags) {
  const known = knownTags.length
    ? '已存在的细分标签（优先从中选用，只有确实无法表达时才创建新标签）：\n' + knownTags.slice(0, 40).join('、') + '\n'
    : ''
  return '你是 DeepSeek Harness 插件市场的编辑。为下面这个 DSH 插件生成多语言简介和功能标签。\n\n' +
    '插件名：' + repo.name + '\n' +
    '英文描述：' + ((repo.description ?? '').slice(0, 200) || '（无）') + '\n' +
    'GitHub topics：' + ((repo.topics ?? []).join(', ') || '（无）') + '\n' +
    'README 长度：' + (repo.readme_len ?? 0) + ' 字符，安装命令示例：' + ((repo.readme_cmds ?? []).slice(0, 2).join(' ; ') || '无') + '\n' +
    known +
    '要求：\n' +
    '1. descriptions：把插件简介翻译成 9 种语言，每种一句话（不超过 60 字/20 词），突出「能做什么、有什么用」，口语化自然，不要翻译腔；en 保持地道英文、zh 中文、ja 日语、ko 韩语、es 西班牙语、fr 法语、de 德语、pt 葡萄牙语、ru 俄语。\n' +
    '2. tags：zh 与 en 各给 3-5 个功能标签（zh 中文标签、en 英文标签），用于分类筛选' + (known ? '，**优先复用上面已存在的标签**（用词一致），只有新功能类型才创建新标签' : '') + '\n\n' +
    '只输出 JSON，不要任何其他文字：\n{"descriptions": {"en": "...", "zh": "...", "ja": "...", "ko": "...", "es": "...", "fr": "...", "de": "...", "pt": "...", "ru": "..."}, "tags": {"zh": ["..."], "en": ["..."]}}'
}

function extractJson(raw) {
  try {
    const cleaned = String(raw).replace(/\x60\x60\x60json\s*/g, '').replace(/\x60\x60\x60\s*/g, '').trim()
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start < 0 || end <= start) return null
    const parsed = JSON.parse(cleaned.slice(start, end + 1))
    const descriptions = {}
    if (parsed.descriptions && typeof parsed.descriptions === 'object') {
      for (const lang of LANGS) {
        const v = String(parsed.descriptions[lang] ?? '').trim()
        if (v !== '') descriptions[lang] = v.slice(0, 200)
      }
    }
    const cleanTags = (arr) => Array.isArray(arr)
      ? arr.map((t) => String(t).trim()).filter(Boolean).filter((t) => !GENERIC_TAGS.has(t)).slice(0, 6)
      : []
    const tags = {
      zh: cleanTags(parsed.tags?.zh),
      en: cleanTags(parsed.tags?.en),
    }
    if (Object.keys(descriptions).length === 0 && tags.zh.length === 0 && tags.en.length === 0) return null
    return { descriptions, tags }
  } catch { return null }
}

async function translateOne(repo, knownTags) {
  const body = {
    model: MODEL,
    messages: [{ role: 'user', content: buildPrompt(repo, knownTags) }],
    temperature: 0.3,
    max_tokens: 1500,
  }
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(BASE_URL + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + API_KEY },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(90_000),
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
      // 缺失语言回退英文简介（保证 9 语言齐全）
      for (const lang of LANGS) {
        if (!result.descriptions[lang]) result.descriptions[lang] = result.descriptions.en ?? ''
      }
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
    log('未找到 API Key——请 export DEEPSEEK_API_KEY=你的key（或确认 ~/.dsh/settings.yaml 的 apiKeyEnv 对应环境变量已设置）；也可 --dry-run 只统计。')
    process.exit(1)
  }
  const repos = loadRegistry()
  const cache = loadCache()
  const cacheEntries = cache.entries ?? {}
  const knownTags = [...new Set(
    Object.values(cacheEntries).flatMap((v) => v.tags?.zh ?? []).filter((t) => /[\u4e00-\u9fff]/.test(t)),
  )].slice(0, 40)

  const todo = []
  for (const repo of repos) {
    const key = repo.full_name.toLowerCase()
    const cached = cacheEntries[key]
    const fp = fingerprint(repo)
    if (cached && cached.descriptions?.en && cached.summaryKey === fp) continue
    todo.push({ repo, key, fp, retranslate: cached?.descriptions?.en ? true : false })
  }
  log('待打标：' + todo.length + ' 条（其中重翻 ' + todo.filter((t) => t.retranslate).length + '）')
  log('baseURL=' + BASE_URL + ' model=' + MODEL)
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
        cacheEntries[item.key] = { descriptions: result.descriptions, tags: result.tags, summaryKey: item.fp, at: new Date().toISOString().slice(0, 10) }
        ok++
        if (ok % 10 === 0) log('进度 ' + ok + '/' + batch.length + ' → ' + item.repo.full_name + ' ' + (result.descriptions.zh ?? '').slice(0, 30))
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  log('完成：成功 ' + ok + '/' + batch.length)

  const entries = {}
  let count = 0
  for (const [key, v] of Object.entries(cacheEntries)) {
    if (!v.descriptions?.en) continue
    entries[key] = { descriptions: v.descriptions, tags: v.tags }
    count++
  }
  writeFileSync(TAGS_OUT, JSON.stringify({ generatedAt: new Date().toISOString(), count, entries }, null, 1) + '\n')
  writeFileSync(CACHE_FILE, JSON.stringify({ generatedAt: new Date().toISOString(), entries: cacheEntries }, null, 1) + '\n')
  log('tags.json 已写：' + count + ' 条（9 语言简介 + zh/en 标签）')

  if (doPush) {
    const { execSync } = await import('node:child_process')
    try {
      execSync('git add tags.json zh-cache.json', { cwd: ROOT, stdio: 'inherit' })
      execSync('git pull --rebase origin main', { cwd: ROOT, stdio: 'inherit' })
      execSync('git commit -m "tags: 多语言打标 ' + ok + ' 条（' + new Date().toISOString().slice(0, 10) + '）"', { cwd: ROOT, stdio: 'inherit' })
      execSync('git push origin main', { cwd: ROOT, stdio: 'inherit' })
      log('已提交并推送——所有 dsh-store 用户将在下次刷新（≤24h 缓存）后收到新标签与多语言简介。')
    } catch (err) {
      log('push 失败（可稍后手动 git push）：' + String(err.message).slice(0, 150))
      process.exit(1)
    }
  } else {
    log('未加 --push：产物已落盘，确认无误后运行 node scripts/tag-i18n.mjs --push 提交。')
  }
}

main().catch((err) => { console.error('[tag-i18n] 失败：' + err.message); process.exit(1) })
