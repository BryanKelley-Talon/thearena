// A MODEL ANSWER IS AN ANSWER KEY. It does not reach dist/ before its date.
//
// BK, 2026-10-24: a student deck coaches and never shows an answer key, and the exemplar
// casefile is not posted until after the unit's test and its make-ups. A ladder's model
// response is the same object. Sam marks one with `model_visible` in the pack
// (`always`, or `unit_close` for "not until this unit is finished"), and his 11.3A L5 note
// says it plainly: "NOT served before the unit closes ... the same rule as the exemplar
// casefile."
//
// Will, 2026-10-27 11:47, asking for this to move out of the page and into the build:
// "if the only thing standing between a kid and the answer is a page behaving correctly,
// it will reach somebody." Correct. A page can be read with the network tab open, and the
// pack is a public JSON file either way — so the model is REMOVED from the served file,
// not hidden by the UI.
//
// Runs on dist/ only; source is untouched. The date lives in the manifest, next to the level
// (`model_opens_on`, YYYY-MM-DD, the device's own date like every other open date here), so a
// desk never has to re-cut a content file to open its model.
//
// THE DEFAULT IS HELD. No date configured means held, not shown: a missing date can never
// leak a model, and the failure mode of this script is a kid not seeing an exemplar, which
// is recoverable, rather than a kid seeing an answer before the test, which is not.
import fs from 'node:fs'
import path from 'node:path'

const today = process.env.ARENA_TODAY || new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date())
const DIST = 'dist'
const MF = path.join(DIST, 'arena.manifest.json')
if (!fs.existsSync(MF)) { console.log('hold-models: no dist manifest, nothing to do'); process.exit(0) }
const m = JSON.parse(fs.readFileSync(MF, 'utf8'))

// Every level's content ref -> the date its model may open, if the manifest gives one.
const opensOn = new Map()
for (const c of m.courses || []) for (const u of c.units || []) for (const l of u.ladders || []) for (const lv of l.levels || []) {
  if (lv.content_ref) opensOn.set(String(lv.content_ref).replace(/^content\//, ''), lv.model_opens_on || u.model_opens_on || null)
}

const held = [], shown = []
for (const f of fs.readdirSync(path.join(DIST, 'content'))) {
  if (!f.endsWith('.json')) continue
  const p = path.join(DIST, 'content', f)
  let d
  try { d = JSON.parse(fs.readFileSync(p, 'utf8')) } catch { continue }
  if (!d.model_response) continue
  const rule = d.model_visible
  if (rule === 'always' || rule == null) continue     // L4's scaffold model is the activity; it stays
  const date = opensOn.get(f)
  const open = typeof date === 'string' && date <= today
  if (open) { shown.push(`${f} (opened ${date})`); continue }
  delete d.model_response
  fs.writeFileSync(p, JSON.stringify(d, null, 1) + '\n')
  held.push(`${f} (${rule}${date ? `, opens ${date}` : ', no date set'})`)
}
console.log(`hold-models: today ${today}; ${held.length} model(s) held out of dist${held.length ? ': ' + held.join('; ') : ''}${shown.length ? ` | ${shown.length} open: ` + shown.join('; ') : ''}`)
