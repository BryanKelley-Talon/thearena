// Strip the desk notes from what is served (Josh, 2026-10-13; Leo's order 10/10, Danny's baseline A-P1).
// Runs after `vite build` and seal-chase. Source keeps every `_` note; dist/ (what Cloudflare serves) keeps none,
// (plus the unread desk fields in DESK), except the two keys the page itself reads: `_default` (the guide-line bank) and `_skill_lines` (a drill's skill chips).
// Rulings, times, desk names and file paths stay on the desk. Nothing about a student was ever in these files.
import fs from 'node:fs'
import path from 'node:path'

const KEEP = new Set(['_default', '_skill_lines'])
// Desk-note fields without the underscore that the page never reads (checked against src/ 2026-10-13).
// A field the page reads (filter_checked, provenance, exam_meta, note) is never on this list.
const DESK = new Set(['recut', 'wording_flag', 'design_note', 'portrait_note', 'errata'])
let files = 0, keys = 0
const strip = o => {
  if (Array.isArray(o)) return o.map(strip)
  if (o && typeof o === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(o)) {
      if ((k.startsWith('_') && !KEEP.has(k)) || DESK.has(k)) { keys++; continue }
      out[k] = strip(v)
    }
    return out
  }
  return o
}
const walk = dir => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p)
    else if (e.name.endsWith('.json')) {
      const before = keys
      const data = strip(JSON.parse(fs.readFileSync(p, 'utf8')))
      if (keys > before) { fs.writeFileSync(p, JSON.stringify(data)); files++ }
    }
  }
}
walk('dist')
console.log(`strip-notes: ${keys} desk notes removed from ${files} served files`)
