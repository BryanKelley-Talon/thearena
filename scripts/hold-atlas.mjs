// ATLAS OFF (BK, 2026-11-03 10:51: "TAKE THEM OFF"). When the served manifest has no course-level
// `atlas`, the Atlas images do not ship either: nobody can reach one by typing its address.
// Runs on dist/ only; source images stay in public/atlas. Bring the Atlas back by restoring
// `atlas` in the manifest (it is parked as `_atlas_off` today).
import fs from 'node:fs'
import path from 'node:path'
const MF = path.join('dist', 'arena.manifest.json')
if (!fs.existsSync(MF)) { console.log('hold-atlas: no dist manifest, nothing to do'); process.exit(0) }
const m = JSON.parse(fs.readFileSync(MF, 'utf8'))
const anyAtlas = (m.courses || []).some(c => Array.isArray(c.atlas) && c.atlas.length)
if (anyAtlas) { console.log('hold-atlas: an Atlas is configured, images kept'); process.exit(0) }
fs.rmSync(path.join('dist', 'atlas'), { recursive: true, force: true })
console.log('hold-atlas: Atlas is off, dist/atlas removed')
