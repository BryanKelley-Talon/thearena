// Nothing answers at a public address before it opens (Josh, 2026-10-13/14; Leo's order 10/10, Danny A-P2; BK 10/14 08:24 "A").
// Runs after `vite build`, before strip-notes. Works on dist/ only; source is untouched.
//  - An entry dated to open later (`opens_on` after today in Corning) is cut to its open date in the served manifest, and its content files leave dist/.
//    On its open date the same commit is rebuilt (one push per open date, on BK's word) and it appears.
//  - An unpublished entry (`published: false`) keeps its label (the page still shows it as not ready) but loses its content refs,
//    and a content file that only it names leaves dist/.
//  - A published chase whose room card waits (`card_opens_on`) is open by BK's ruling (10/9 09:12: the link is live for colleagues). It stays.
import fs from 'node:fs'
import path from 'node:path'

const today = process.env.ARENA_TODAY || new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date())
const MF = 'dist/arena.manifest.json'
const m = JSON.parse(fs.readFileSync(MF, 'utf8'))
const REF = /^(content|atlas)\/[^#?]+\.json$/
const held = new Set(), labels = []
const refsIn = (o, out = new Set()) => {
  if (typeof o === 'string') { if (REF.test(o)) out.add(o) }
  else if (Array.isArray(o)) o.forEach(v => refsIn(v, out))
  else if (o && typeof o === 'object') Object.values(o).forEach(v => refsIn(v, out))
  return out
}
const dropRefs = o => {
  if (Array.isArray(o)) o.forEach(dropRefs)
  else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) {
    if (typeof v === 'string' && REF.test(v)) { held.add(v); delete o[k] } else dropRefs(v)
  }
}
const later = o => typeof o?.opens_on === 'string' && o.opens_on > today
const walk = o => {
  if (Array.isArray(o)) {
    for (let i = o.length - 1; i >= 0; i--) {
      const x = o[i]
      if (x && typeof x === 'object' && later(x)) {
        refsIn(x).forEach(r => held.add(r)); labels.push(`${x.label || x.title || x.name || x.id || [...refsIn(x)][0] || '?'} (opens ${x.opens_on})`)
        // Only the open date stays, so the page can still say "opens Oct 23" (the moments card) exactly as it does today.
        const stub = { published: x.published, opens_on: x.opens_on }; if (x.tool) stub.tool = x.tool
        o[i] = stub
      }
      else walk(x)
    }
  } else if (o && typeof o === 'object') {
    if (o.published === false) { const before = held.size; dropRefs(o); if (held.size > before) labels.push(`${o.label || o.name || o.id || '?'} (unpublished)`) }
    for (const v of Object.values(o)) walk(v)
  }
}
walk(m)
fs.writeFileSync(MF, JSON.stringify(m))
const still = refsIn(m)
const IMG = /[\w.-]+\.(?:webp|png|jpe?g|gif|svg)$/i
const imgsIn = (o, out = new Set()) => {
  if (typeof o === 'string') { const t = o.split('/').pop(); if (IMG.test(t)) out.add(t) }
  else if (Array.isArray(o)) o.forEach(v => imgsIn(v, out))
  else if (o && typeof o === 'object') Object.values(o).forEach(v => imgsIn(v, out))
  return out
}
let removed = 0
const goneImgs = new Set()
for (const r of held) if (!still.has(r)) {
  const p = path.join('dist', r)
  if (fs.existsSync(p)) { imgsIn(JSON.parse(fs.readFileSync(p, 'utf8'))).forEach(i => goneImgs.add(i)); fs.unlinkSync(p); removed++ }
}
// An image only held content uses leaves too; one any served file still names stays.
if (goneImgs.size) {
  const served = new Set(), scan = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
    const p = path.join(d, e.name)
    if (e.isDirectory()) scan(p); else if (e.name.endsWith('.json')) imgsIn(JSON.parse(fs.readFileSync(p, 'utf8'))).forEach(i => served.add(i))
  })
  scan('dist')
  const js = fs.readdirSync('dist/assets').filter(f => f.endsWith('.js')).map(f => fs.readFileSync(path.join('dist/assets', f), 'utf8')).join('\n')
  // Match by stem: a content file may name doc7.jpg while the page serves doc7.webp.
  const stem = f => f.replace(/\.[^.]+$/, '')
  const servedStems = new Set([...served].map(stem))
  const gone = new Set([...goneImgs].map(stem).filter(t => !servedStems.has(t) && !js.includes(t)))
  for (const dir of ['dist/content', 'dist/images', 'dist/atlas']) if (fs.existsSync(dir))
    for (const f of fs.readdirSync(dir)) if (IMG.test(f) && gone.has(stem(f))) { fs.unlinkSync(path.join(dir, f)); removed++ }
}
// A model answer held to the unit's close (Sam 2026-10-23: `model_visible: "unit_close"`, the exemplar-casefile
// rule). It leaves the served file until the ladder level that names the file carries `model_opens_on` and that
// day has come. No date means never served: the safe failure, since a model served early turns a cold write
// into a copy exercise.
const SRC = JSON.parse(fs.readFileSync('public/arena.manifest.json', 'utf8'))
const modelDates = {}
const findLevels = o => {
  if (Array.isArray(o)) o.forEach(findLevels)
  else if (o && typeof o === 'object') {
    if (typeof o.content_ref === 'string' && o.model_opens_on) modelDates[o.content_ref.replace(/^content\//, '')] = String(o.model_opens_on)
    Object.values(o).forEach(findLevels)
  }
}
findLevels(SRC)
const modelsHeld = []
if (fs.existsSync('dist/content')) for (const f of fs.readdirSync('dist/content')) {
  if (!f.endsWith('.json')) continue
  const p = path.join('dist/content', f)
  const raw = fs.readFileSync(p, 'utf8')
  if (!raw.includes('"unit_close"')) continue
  const d = JSON.parse(raw)
  if (d.model_visible !== 'unit_close' || !('model_response' in d)) continue
  const on = modelDates[f]
  if (on && on <= today) continue
  delete d.model_response
  fs.writeFileSync(p, JSON.stringify(d, null, 2) + '\n')
  modelsHeld.push(`${f} (${on ? `model opens ${on}` : 'no model date'})`)
}
if (modelsHeld.length) console.log(`hold-unopened: ${modelsHeld.length} model answers held to unit close: ${modelsHeld.join('; ')}`)
console.log(`hold-unopened: today ${today}; ${labels.length} entries held (${labels.join('; ')}); ${removed} files left out of dist`)
