#!/usr/bin/env node
/**
 * 黑名单管道（v1.14）：产出 exclusions.json，供 dsh-store「黑名单」筛选使用。
 * - 种子：bruc3van/awesome-dsh-plugin data/curated.json（MIT 许可，引用出处），
 *   excluded_repos→kind=excluded、leaderboard_exclusions→kind=leaderboard、
 *   market_exclusions→kind=market，理由原样保留（公开可查）。
 * - 本地覆盖：data/exclusions.local.json（remove 数组剔除、entries 对象增改，
 *   优先级高于种子）。
 * - 种子拉取失败时仅用本地数据并告警（fail-open，不阻塞构建）。
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const OUT_FILE = process.env.EXCLUSIONS_FILE ?? join(ROOT, "exclusions.json")
const LOCAL_FILE = join(ROOT, "data", "exclusions.local.json")
const SEED_URL = "https://raw.githubusercontent.com/bruc3van/awesome-dsh-plugin/main/data/curated.json"

const log = (msg) => console.log("[exclusions] " + msg)

async function main() {
  let local = { remove: [], entries: {} }
  try {
    local = JSON.parse(readFileSync(LOCAL_FILE, "utf8"))
  } catch { /* 无本地文件：全用种子 */ }

  let seed = null
  try {
    const res = await fetch(SEED_URL, { headers: { "user-agent": "dsh-market-index" }, signal: AbortSignal.timeout(30_000) })
    if (res.ok) seed = await res.json()
    else log("seed fetch HTTP " + res.status + " — local only")
  } catch (err) {
    log("seed fetch failed (" + (err instanceof Error ? err.message : String(err)) + ") — local only")
  }

  const entries = {}
  const add = (map, kind) => {
    if (!map || typeof map !== "object") return
    for (const [key, value] of Object.entries(map)) {
      const reason = typeof value === "string" && value !== "" ? value : (value && typeof value === "object" && typeof value.reason === "string" ? value.reason : "listed for review")
      entries[key] = { kind, reason }
    }
  }
  if (seed !== null) {
    add(seed.excluded_repos, "excluded")
    add(seed.leaderboard_exclusions, "leaderboard")
    add(seed.market_exclusions, "market")
  }
  const remove = Array.isArray(local.remove) ? local.remove : []
  for (const key of remove) delete entries[key]
  const localEntries = (local && typeof local.entries === "object") ? local.entries : {}
  for (const [key, value] of Object.entries(localEntries)) {
    if (value === null) { delete entries[key]; continue }
    if (typeof value === "object" && value !== null && typeof value.reason === "string") entries[key] = { kind: value.kind === "leaderboard" || value.kind === "market" ? value.kind : "excluded", reason: value.reason }
  }

  const out = { version: 1, generated_at: new Date().toISOString(), count: Object.keys(entries).length, entries }
  writeFileSync(OUT_FILE, JSON.stringify(out, null, 2) + "\n")
  log("wrote " + OUT_FILE + " with " + out.count + " entries")
}

main().catch((error) => { console.error(error); process.exit(1) })
