// Resolve every anchor in the served manifest to its date, before hold-unopened reads opens_on.
// Works on dist/ only; public/ keeps the anchors. See src/calendar.js. A name that doesn't resolve fails the build.
import fs from 'node:fs'
import { resolveCalendar, todayInCorning } from '../src/calendar.js'

const today = process.env.ARENA_TODAY || todayInCorning()
const MF = process.argv[2] || 'dist/arena.manifest.json'
const m = JSON.parse(fs.readFileSync(MF, 'utf8'))
const problems = resolveCalendar(m, today)
if (problems.length) { problems.forEach(p => console.error(`  FAIL  calendar\n        ${p}`)); process.exit(1) }
fs.writeFileSync(MF, JSON.stringify(m))
const cur = (m.courses || []).map(c => `${c.id} door on ${c.current_unit}`).join('; ')
console.log(`resolve-calendar: today ${today}; ${cur}`)
