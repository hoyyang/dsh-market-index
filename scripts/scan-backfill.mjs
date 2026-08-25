#!/usr/bin/env node
/**
 * scan-backfill（v1.21 配套）：离线把 registry.json 里 bundled 未知（null/undefined）
 * 的非 fork 条目一次性补扫——raw 根 package.json（零额度）+ jsDelivr data API 全树
 * 子包抽查（零额度，monorepo/无根 manifest 两种形态）。命中 dsh.bundle → bundled=true
 * + bundled_at=今天；未命中保持 null（下轮 CI 重试）。写回 registry.json + .json.gz。
 *
 * 用法：node scripts/scan-backfill.mjs [--limit N] [--dry]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const OUT = join(ROOT, 'registry.json')
const args = process.argv.slice(2)
const LIMIT = Number((args.find(a => a.startsWith('--limit=')) ?? '--limit=0').split('=')[1]) || 0
const DRY = args.includes('--dry')
const RAW_CONCURRENCY = 16
const JSD_CONCURRENCY = 8
const TIMEOUT = 12_000

const hasBundle = (pkg) => {
  const p = pkg
  return p !== null && typeof p === 'object' && p.dsh && typeof p.dsh === 'object' && p.dsh.bundle !== undefined
}
const collectPkgPaths = (files, prefix = '', out = []) => {
  for (const f of files ?? []) {
    if (f && f.type === 'file' && typeof f.name === 'string') {
      const p = prefix + f.name
      if (p.endsWith('package.json') && !/node_modules/.test(p)) out.push(p)
    } else if (f && f.type === 'directory' && typeof f.name === 'string') {
      collectPkgPaths(f.files, prefix + f.name + '/', out)
    }
  }
  return out
}

const data = JSON.parse(readFileSync(OUT, 'utf8'))
const repos = data.repos ?? []
const todo = repos.filter(r => (r.bundled === undefined || r.bundled === null) && typeof r.full_name === 'string' && !r.fork)
const queue = (LIMIT > 0 ? todo.slice(0, LIMIT) : todo).map(r => ({ ...r }))
const scanAt = new Date().toISOString().slice(0, 10)
let hit = 0
let jsdHit = 0
let jsdFail = 0
let monoQueued = 0
let flushedAt = 0

// 周期落盘（每 60s 或每 150 命中）——被中断也能保留大部分成果
const flush = () => {
  if (DRY) return
  for (const r of repos) {
    const q = queueMap.get(r.full_name)
    if (q && q.bundled === true) { r.bundled = true; r.bundled_at = q.bundled_at }
  }
  const raw = JSON.stringify(data, null, 2)
  writeFileSync(OUT, raw, 'utf8')
  writeFileSync(OUT + '.gz', gzipSync(raw))
  flushedAt = Date.now()
}
const queueMap = new Map(queue.map(r => [r.full_name, r]))
const maybeFlush = () => {
  if (Date.now() - flushedAt > 60_000 && hit > 0) flush()
}

const rawWorker = async () => {
  while (queue.length > 0) {
    const r = queue.shift()
    if (r === undefined) return
    try {
      const res = await fetch('https://raw.githubusercontent.com/' + r.full_name + '/HEAD/package.json', {
        headers: { 'user-agent': 'dsh-plugin-marketplace-registry-backfill' },
        signal: AbortSignal.timeout(TIMEOUT),
      })
      if (!res.ok) { monoQueued++; continue }
      const parsed = JSON.parse((await res.text()).slice(0, 200_000))
      if (hasBundle(parsed)) {
        r.bundled = true
        r.bundled_at = scanAt
        hit++
        if (hit % 200 === 0) console.log('  raw hit so far:', hit)
        maybeFlush()
      } else {
        monoQueued++
        const branch = typeof r.default_branch === 'string' && r.default_branch !== '' ? r.default_branch : 'main'
        try {
          const jsd = await fetch('https://data.jsdelivr.com/v1/packages/gh/' + r.full_name + '@' + branch, {
            headers: { 'user-agent': 'dsh-plugin-marketplace-registry-backfill' },
            signal: AbortSignal.timeout(TIMEOUT),
          })
          if (!jsd.ok) { jsdFail++; continue }
          const body = await jsd.json()
          const pkgs = collectPkgPaths(body?.files).sort((a, b) => a.split('/').length - b.split('/').length).slice(0, 20)
          for (const p of pkgs) {
            const raw = await fetch('https://raw.githubusercontent.com/' + r.full_name + '/HEAD/' + p, {
              headers: { 'user-agent': 'dsh-plugin-marketplace-registry-backfill' },
              signal: AbortSignal.timeout(TIMEOUT),
            })
            if (!raw.ok) continue
            const parsed2 = JSON.parse((await raw.text()).slice(0, 200_000))
            if (hasBundle(parsed2)) {
              r.bundled = true
              r.bundled_at = scanAt
              hit++
              jsdHit++
              break
            }
          }
        } catch { jsdFail++ }
      }
    } catch { /* 网络失败：保持 null */ }
  }
}

const t0 = Date.now()
console.log('scan-backfill: todo =', queue.length, '（LIMIT =', LIMIT, '）')
await Promise.all(Array.from({ length: RAW_CONCURRENCY }, () => rawWorker()))
console.log('scan done in', Math.round((Date.now() - t0) / 1000), 's：hit =', hit, '（jsDelivr 子包命中', jsdHit, '），jsdFail =', jsdFail, '，monoQueued =', monoQueued)

// 写回（flush 把队列命中映射回 repos）
if (!DRY) {
  flush()
  console.log('wrote', OUT)
} else {
  console.log('dry run — not written')
}
const after = repos.filter(r => (r.bundled === undefined || r.bundled === null) && typeof r.full_name === 'string' && !r.fork).length
console.log('remaining null/missing:', after)
