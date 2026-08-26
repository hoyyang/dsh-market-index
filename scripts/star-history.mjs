/**
 * v1.22：星数 30 天滚动快照——star-history.json（dsh-mall 热度 v2 星动量数据源）。
 * 每日班次把当天 registry.json 的星数追加进滚动窗口（同日覆盖），仅保留最近
 * 30 天；只收 stars>=5 的仓库（动量闸门基线≥10，5 星以下无动量价值，控体积）。
 * 输出：{ schemaVersion, generatedAt, entries: { "owner/repo": [{d,s},...] } }
 * 运行：node scripts/star-history.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const REGISTRY = join(ROOT, 'registry.json')
const OUT = join(ROOT, 'star-history.json')
const WINDOW_DAYS = 30
const MIN_STARS = 5

function iso(d) {
  return d.toISOString().slice(0, 10)
}

function main() {
  const reg = JSON.parse(readFileSync(REGISTRY, 'utf8'))
  const repos = reg.repos ?? []
  const today = iso(new Date())
  const cutoff = Date.now() - WINDOW_DAYS * 86_400_000

  let hist = {}
  try { hist = (JSON.parse(readFileSync(OUT, 'utf8')).entries ?? {}) } catch { /* 首跑 */ }

  const todayStars = {}
  for (const r of repos) {
    const s = r.stargazers_count
    if (typeof s !== 'number' || s < MIN_STARS) continue
    todayStars[r.full_name] = s
  }

  const entries = {}
  for (const [fullName, snaps] of Object.entries(hist)) {
    if (!Array.isArray(snaps)) continue
    const kept = snaps.filter(x => x !== null && typeof x === 'object' && typeof x.d === 'string' && Date.parse(x.d) >= cutoff)
    if (kept.length === 0) continue
    entries[fullName] = kept
  }
  for (const [fullName, stars] of Object.entries(todayStars)) {
    const arr = entries[fullName] ?? []
    if (arr.length > 0 && arr[arr.length - 1].d === today) arr[arr.length - 1].s = stars
    else arr.push({ d: today, s: stars })
    entries[fullName] = arr
  }

  const out = { schemaVersion: 1, generatedAt: new Date().toISOString(), count: Object.keys(entries).length, entries }
  writeFileSync(OUT, JSON.stringify(out))
  console.log('[star-history] 写入 ' + OUT + '：' + out.count + ' 个仓库窗口（' + today + '，仅保留 ' + WINDOW_DAYS + ' 天）')
}

main()
