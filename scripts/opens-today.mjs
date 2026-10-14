// What opens today, by the Arena's own manifest (Josh, 2026-10-14; BK 10/14 08:43 "2. yes", 10:21 "work the blueprint rebuilds now").
// hold-unopened.mjs leaves dated content out of the build until its day, so the build has to run again that morning.
// Prints one line per thing dated today (Corning time) and exits 0; prints nothing when nothing opens.
// Usage: node scripts/opens-today.mjs [YYYY-MM-DD]
import fs from 'node:fs'
const today = process.argv[2] || new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date())
const m = JSON.parse(fs.readFileSync('public/arena.manifest.json', 'utf8'))
const hits = []
const walk = (o, where) => {
  if (Array.isArray(o)) return o.forEach((v, i) => walk(v, `${where}[${i}]`))
  if (!o || typeof o !== 'object') return
  for (const k of ['opens_on', 'card_opens_on', 'on']) if (o[k] === today) hits.push(`${o.label || o.title || o.content_ref || o.slug || where} (${k})`)
  for (const [k, v] of Object.entries(o)) if (v && typeof v === 'object') walk(v, `${where}.${k}`)
}
walk(m, 'manifest')
for (const h of hits) console.log(h)
