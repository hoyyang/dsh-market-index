/**
 * v1.22：npm 下载量采集——downloads.json（dsh-mall 热度 v2 数据源之一）。
 * - 非 scoped 包：bulk point API 四窗口（last-week / 上 7 天 / last-month / 年初至今），
 *   每批 ≤100，4 并发（bulk 不支持 scoped）。
 * - scoped 包：单包 range API 一次取年初至今逐日序列，推导四项（6 并发）。
 * - 失败跳过 + 上次 downloads.json 缓存继承（网络抖动不丢已有数据）。
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
const BULK_CONCURRENCY = 4
const SCOPED_CONCURRENCY = 6
const TIMEOUT_MS = 20_000

const limitArg = Number(process.argv[process.argv.indexOf('--limit') + 1] ?? 0) || 0

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

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { accept: 'application/json', 'user-agent': 'dsh-market-index' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + url)
  return await res.json()
}

async function fetchWithRetry(url, tries = 2) {
  for (let i = 0; i < tries; i++) {
    try { return await fetchJson(url) } catch (err) { if (i === tries - 1) throw err }
  }
  throw new Error('unreachable')
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

  // 上次缓存（继承兜底）
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
      const body = await fetchWithRetry('https://api.npmjs.org/downloads/point/' + win + '/' + batch.join(','))
      for (const [name, v] of Object.entries(body ?? {})) {
        if (v !== null && typeof v === 'object' && typeof v.downloads === 'number') {
          ;(fresh[name] ??= {})[key] = v.downloads
        }
      }
    })
    console.log('[downloads] ' + key + ' 窗口完成（已采集 ' + Object.keys(fresh).length + ' 个包）')
  }

  // scoped：单包 range 逐日序列
  await pool(scoped, SCOPED_CONCURRENCY, async (name) => {
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

  // 合并：fresh 优先，缓存继承
  const entries = {}
  let freshCount = 0
  let staleCount = 0
  for (const name of pkgs) {
    const f = fresh[name]
    if (f !== undefined) { entries[name] = f; freshCount++; continue }
    const p = prev[name]
    if (p !== undefined) { entries[name] = p; staleCount++; continue }
  }
  const out = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    count: Object.keys(entries).length,
    entries,
  }
  writeFileSync(OUT, JSON.stringify(out))
  console.log('[downloads] 写入 ' + OUT + '：fresh ' + freshCount + ' / 缓存继承 ' + staleCount + ' / 总 ' + out.count)
}

main().catch((err) => { console.error('[downloads] FAILED:', err); process.exit(1) })
