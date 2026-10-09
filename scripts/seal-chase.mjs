// Seal the chase keys in the student build (Josh, 2026-10-06). Runs after `vite build`.
// The last door's key is the teacher's: dist keeps only a SHA-256 of each word, salted with the
// pack id, and the chase compares hashes. Case and every space are ignored (keyNorm in chase.jsx). Same as Case Closed's sealed keys.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { keyNorm, answerFor } from '../src/chase-norm.js'
// One normalizer for the page and the seal (src/chase-norm.js; Will v6 2026-10-09: accents, punctuation, leading words).
const hash = (id, w) => crypto.createHash('sha256').update(`${id}|${keyNorm(w)}`).digest('hex')
let n = 0
for (const dir of ['dist/content', 'dist/_proof']) {
  if (!fs.existsSync(dir)) continue
  for (const f of fs.readdirSync(dir).filter(x => /^chase-.*\.json$/.test(x))) {
    const p = path.join(dir, f), pk = JSON.parse(fs.readFileSync(p, 'utf8'))
    if (pk.final?.key_words) {
      const by = pk.final.after_by_answer
      // A line per answer (Will v6) would name the answers in plain text, so it's sealed too: hash -> line.
      if (by) { pk.final.after_hashes = Object.fromEntries(pk.final.key_words.map(w => [hash(pk.id, w), by[answerFor(w, Object.keys(by))]])); delete pk.final.after_by_answer }
      pk.final.key_hashes = pk.final.key_words.map(w => hash(pk.id, w)); delete pk.final.key_words
      fs.writeFileSync(p, JSON.stringify(pk)); n++
    }
  }
}
console.log(`seal-chase: ${n} chase pack(s) sealed`)
