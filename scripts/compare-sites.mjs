// THE PROMOTE PROOF (Josh's sandbox spec §4; BK 2026-11-04 13:15 "1. yes").
//
//   node scripts/compare-sites.mjs <sandbox-base> <live-base>
//   node scripts/compare-sites.mjs https://sandbox-thearena.bryan-talonpass.workers.dev https://thearena.flashpointhistory.com
//
// Fetches, from BOTH addresses and with no cache: the front page, every file the front page names
// (scripts, styles, icons), the manifest, and every content file the manifest names. Compares sha256.
// Prints one line per file and a last line for the memo:
//   "Live = sandbox: N files, all match."  (exit 0)
// or names every mismatch and missing file (exit 1). A mismatch is a stop, not a shrug.
// Reads only. Changes nothing on either site.

import { createHash } from 'node:crypto'

const [sandbox, live] = process.argv.slice(2).map(s => (s || '').replace(/\/+$/, ''))
if (!sandbox || !live) {
  console.error('usage: node scripts/compare-sites.mjs <sandbox-base> <live-base>')
  process.exit(2)
}

const sha = buf => createHash('sha256').update(buf).digest('hex')

async function get(base, path) {
  const res = await fetch(base + path, { headers: { 'cache-control': 'no-cache', pragma: 'no-cache' }, redirect: 'follow' })
  const buf = Buffer.from(await res.arrayBuffer())
  return { status: res.status, buf }
}

// Paths the front page names, same-origin only.
function namedBy(html) {
  const out = new Set()
  for (const m of html.matchAll(/\b(?:src|href)\s*=\s*"([^"]+)"/g)) {
    const p = m[1]
    if (/^(https?:)?\/\//i.test(p) || p.startsWith('#') || p.startsWith('data:') || p.startsWith('mailto:')) continue
    out.add(p.startsWith('/') ? p : '/' + p)
  }
  return out
}

// Content files the manifest names (any "content_ref" string, at any depth).
function refsIn(json, out = new Set()) {
  if (Array.isArray(json)) json.forEach(x => refsIn(x, out))
  else if (json && typeof json === 'object') {
    for (const [k, v] of Object.entries(json)) {
      if (k === 'content_ref' && typeof v === 'string') out.add('/' + v.replace(/^\/+/, '').replace(/[#?].*$/, ''))
      else refsIn(v, out)
    }
  }
  return out
}

const paths = new Set(['/'])
const front = await get(live, '/')
const frontS = await get(sandbox, '/')
for (const p of namedBy(front.buf.toString('utf8'))) paths.add(p)
for (const p of namedBy(frontS.buf.toString('utf8'))) paths.add(p)

for (const base of [live, sandbox]) {
  const m = await get(base, '/arena.manifest.json')
  if (m.status === 200) {
    paths.add('/arena.manifest.json')
    try { for (const p of refsIn(JSON.parse(m.buf.toString('utf8')))) paths.add(p) } catch { /* reported as mismatch below if it differs */ }
  }
}

let bad = 0, n = 0
for (const p of [...paths].sort()) {
  const [a, b] = await Promise.all([get(sandbox, p), get(live, p)])
  // A held file is absent from BOTH dist folders and the SPA fallback serves the front page for it.
  // That is a match when both sides agree; it is listed so the count is honest.
  const ha = sha(a.buf), hb = sha(b.buf)
  const same = a.status === b.status && ha === hb
  n++
  if (!same) bad++
  console.log(`${same ? 'MATCH   ' : 'MISMATCH'} ${p}  sandbox ${a.status} ${ha.slice(0, 12)}  live ${b.status} ${hb.slice(0, 12)}`)
}

console.log(bad
  ? `STOP: ${bad} of ${n} files differ between sandbox and live. Not promoted until they match.`
  : `Live = sandbox: ${n} files, all match.`)
process.exit(bad ? 1 : 0)
