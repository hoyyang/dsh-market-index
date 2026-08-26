/**
 * v1.22.1：npm 下载量采集——downloads.json（dsh-mall 热度 v2 数据源之一）。
 * - 非 scoped 包：bulk point API 四窗口（last-week / 上 7 天 / last-month / 年初至今），
 *   每批 ≤100，2 并发 + 300ms 节流（v1.22.1：4 并发被 npm 限流 429，大量窗口丢失）。
 * - scoped 包：单包 range API 一次取年初至今逐日序列，推导四项（3 并发 + 150ms 节流）。
 * - 429/5xx 指数退避重试；失败跳过 + 上次 downloads.json 窗口级缓存合并
 *   （v1.22.1：整包覆盖会把"本轮失败窗口"抹掉，改为逐窗口合并继承）。
 * 输出 downloads.json：{ schemaVersion, generatedAt, count, entries: { pkg: {dl7,dl7prev,dl30,dlYTD} } }
 * 运行：node scripts/downloads.mjs [--limit N]（--limit 用于试跑）
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const REGISTRY = join(ROOT, 'registry.json')
const OUT = join(ROOT, 'downloads.json')
const BULK_LIMIT = 100
const BULK_CONCURRENCY = 2
const BULK_DELAY_MS = 300
const SCOPED_CONCURRENCY = 1
const SCOPED_DELAY_MS = 800
const TIMEOUT_MS = 20_000

const limitArg = Number(process.argv[process.argv.indexOf('--limit') + 1] ?? 0) || 0

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

function iso(d) {
  return d.toISOString().slice(0, 10)
}
function shiftDays(n) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + n)
  return iso(d)
}

const TODAY = iso(new Date())
const YTD_START = TODAY.slice(0, 4) + '-01-01'
const YESTERDAY = shiftDays(-1)
const PREV7_START = shiftDays(-14)
const PREV7_END = shiftDays(-8)

async function fetchJsonStatus(url) {
  const res = await fetch(url, {
    headers: { accept: 'application/json', 'user-agent': 'dsh-market-index' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  return { ok: res.ok, status: res.status, body: await res.json().catch(() => null) }
}

let cooldownUntil = 0
async function fetchWithRetry(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    if (Date.now() < cooldownUntil) await sleep(cooldownUntil - Date.now())
    const r = await fetchJsonStatus(url)
    if (r.ok) return r.body
    if (r.status === 429 || r.status >= 500) {
      cooldownUntil = Math.max(cooldownUntil, Date.now() + 20_000)
      await sleep(2000 + 2000 * i)
      continue
    }
    throw new Error('HTTP ' + r.status)
  }
  throw new Error('HTTP retry exhausted: ' + url)
}

async function pool(items, concurrency, fn) {
  const out = new Map()
  let i = 0
  const workers = Array.from({ length: concurrency }, async () => {
    while (i < items.length) {
      const item = items[i++]
      try {
        const r = await fn(item)
        if (r !== null && r !== undefined) out.set(item, r)
      } catch { /* 失败跳过，缓存继承兜底 */ }
    }
  })
  await Promise.all(workers)
  return out
}

async function main() {
  const reg = JSON.parse(readFileSync(REGISTRY, 'utf8'))
  const repos = reg.repos ?? []
  let pkgs = [...new Set(repos.map(r => r.pkg_name).filter(p => typeof p === 'string' && p !== ''))]
  if (limitArg > 0) pkgs = pkgs.slice(0, limitArg)
  const unscoped = pkgs.filter(p => !p.startsWith('@'))
  const scoped = pkgs.filter(p => p.startsWith('@'))
  console.log('[downloads] 总包 ' + pkgs.length + '（非 scoped ' + unscoped.length + ' / scoped ' + scoped.length + '）')

  // 上次缓存（窗口级合并兜底）
  let prev = {}
  try { prev = (JSON.parse(readFileSync(OUT, 'utf8')).entries ?? {}) } catch { /* 首跑 */ }

  const fresh = {}

  // 非 scoped：四窗口 bulk
  const windows = [
    ['dl7', 'last-week'],
    ['dl7prev', PREV7_START + ':' + PREV7_END],
    ['dl30', 'last-month'],
    ['dlYTD', YTD_START + ':' + YESTERDAY],
  ]
  const batches = []
  for (let i = 0; i < unscoped.length; i += BULK_LIMIT) batches.push(unscoped.slice(i, i + BULK_LIMIT))
  for (const [key, win] of windows) {
    await pool(batches, BULK_CONCURRENCY, async (batch) => {
      await sleep(BULK_DELAY_MS)
      const body = await fetchWithRetry('https://api.npmjs.org/downloads/point/' + win + '/' + batch.join(','))
      for (const [name, v] of Object.entries(body ?? {})) {
        if (v !== null && typeof v === 'object' && typeof v.downloads === 'number') {
          ;(fresh[name] ??= {})[key] = v.downloads
        }
      }
    })
    console.log('[downloads] ' + key + ' 窗口完成（已采集 ' + Object.keys(fresh).length + ' 个包）')
  }
  // bulk 阶段成果先落盘（scoped 阶段可能因限流耗时很长）
  {
    const partial = {}
    let pc = 0
    for (const name of pkgs) {
      const f = fresh[name]
      const p = prev[name]
      if (f !== undefined) { partial[name] = { ...p, ...f }; pc++ }
      else if (p !== undefined) partial[name] = p
    }
    writeFileSync(OUT, JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), count: Object.keys(partial).length, entries: partial }))
    console.log('[downloads] bulk 阶段落盘 ' + pc + ' 个 fresh 包')
  }

  // scoped：单包 range 逐日序列（--skip-scoped 时跳过——限流期先保 bulk 成果，CI 每日班次逐渐补齐）
  if (process.argv.includes('--skip-scoped')) {
    console.log('[downloads] --skip-scoped：跳过 scoped 阶段')
  } else {
  await pool(scoped, SCOPED_CONCURRENCY, async (name) => {
    await sleep(SCOPED_DELAY_MS)
    const body = await fetchWithRetry('https://api.npmjs.org/downloads/range/' + YTD_START + ':' + YESTERDAY + '/' + name)
    const pts = (body?.downloads ?? []).map(x => x.downloads)
    if (pts.length === 0) throw new Error('no data')
    fresh[name] = {
      dl7: pts.slice(-7).reduce((a, b) => a + b, 0),
      dl7prev: pts.slice(-14, -7).reduce((a, b) => a + b, 0),
      dl30: pts.slice(-30).reduce((a, b) => a + b, 0),
      dlYTD: pts.reduce((a, b) => a + b, 0),
    }
  })
  console.log('[downloads] scoped 完成（累计采集 ' + Object.keys(fresh).length + ' 个包）')
  }

  // 合并：窗口级——本轮失败的窗口继承上次值（bulk 阶段后先落盘一次，scoped 阶段超时也不丢 bulk 成果）
  const merge = () => {
    const entries = {}
    let freshCount = 0
    let staleCount = 0
    for (const name of pkgs) {
      const f = fresh[name]
      const p = prev[name]
      if (f !== undefined) {
        entries[name] = { ...p, ...f }
        freshCount++
        continue
      }
      if (p !== undefined) { entries[name] = p; staleCount++; continue }
    }
    const out = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      count: Object.keys(entries).length,
      entries,
    }
    writeFileSync(OUT, JSON.stringify(out))
    return { freshCount, staleCount, total: out.count }
  }
  const m = merge()
  console.log('[downloads] 写入 ' + OUT + '：fresh ' + m.freshCount + ' / 缓存继承 ' + m.staleCount + ' / 总 ' + m.total)
}

main().catch((err) => { console.error('[downloads] FAILED:', err); process.exit(1) })
