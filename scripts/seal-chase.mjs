// Seal the chase keys in the student build (Josh, 2026-10-06). Runs after `vite build`.
// The last door's key is the teacher's: dist keeps only a SHA-256 of each word, salted with the
// pack id, and the chase compares hashes. Case and every space are ignored (keyNorm in chase.jsx). Same as Case Closed's sealed keys.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
const hash = (id, w) => crypto.createHash('sha256').update(`${id}|${String(w).replace(/\s+/g, '').toLowerCase()}`).digest('hex')
let n = 0
for (const dir of ['dist/content', 'dist/_proof']) {
  if (!fs.existsSync(dir)) continue
  for (const f of fs.readdirSync(dir).filter(x => /^chase-.*\.json$/.test(x))) {
    const p = path.join(dir, f), pk = JSON.parse(fs.readFileSync(p, 'utf8'))
    if (pk.final?.key_words) { pk.final.key_hashes = pk.final.key_words.map(w => hash(pk.id, w)); delete pk.final.key_words; fs.writeFileSync(p, JSON.stringify(pk)); n++ }
  }
}
console.log(`seal-chase: ${n} chase pack(s) sealed`)
