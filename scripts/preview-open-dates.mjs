// AUDIT PREVIEW BRANCH ONLY (BK 2026-11-03 13:4x, "I AM ORDERING IT"). Never merge to main.
// Opens every dated door in the served manifest so Danny and BK can play 11.3A and 10.3 end to end.
// The build steps before this one ran with a late ARENA_TODAY, so the content files are in dist/.
// This step makes the page's own date checks pass too, and drops the anchor names so the page
// cannot recompute the real dates. Answer-key models stay held (hold-models ran on the real date).
import fs from 'node:fs'
const MF = 'dist/arena.manifest.json'
const m = JSON.parse(fs.readFileSync(MF, 'utf8'))
let n = 0
const walk = o => {
  if (Array.isArray(o)) return o.forEach(walk)
  if (!o || typeof o !== 'object') return
  for (const k of Object.keys(o)) {
    if ((k === 'opens_on' || k === 'card_opens_on') && typeof o[k] === 'string') { o[k] = '2000-01-01'; n++ }
    else if (k === 'opens_at' || k === 'card_opens_at') delete o[k]
    else walk(o[k])
  }
}
walk(m)
fs.writeFileSync(MF, JSON.stringify(m))
console.log(`preview-open-dates: ${n} dated doors opened (preview branch only)`)
