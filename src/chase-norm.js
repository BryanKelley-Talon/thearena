// How a typed chase answer is checked (shared by chase.jsx and scripts/seal-chase.mjs, so the
// student build's sealed hashes and the page always agree).
// Will 2026-10-08: case and every space are ignored. Will v6 2026-10-09 (BK 08:27): accents and
// punctuation too, and a leading "the", "kingdom of" or "empire of" ("the Kingdom of Serbia" = "Serbia").
const LEADS = /^(the|kingdom of|empire of)\s+/
export function keyNorm(k) {
  let s = String(k || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  s = s.replace(/[^a-z0-9&\s]/g, ' ').replace(/\s+/g, ' ').trim()
  for (let prev = null; prev !== s;) { prev = s; s = s.replace(LEADS, '') }
  return s.replace(/[^a-z0-9&]/g, '')
}

// Which of the pack's answers a right word belongs to (final.after_by_answer, Will v6): the closest
// by edit distance, so a misspelling ("nationalisim") or a plural ("conflicts") gets its own line.
function dist(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[a.length][b.length]
}
export function answerFor(word, answers) {
  const w = keyNorm(word)
  let best = null, bd = Infinity
  for (const a of answers || []) { const x = dist(w, keyNorm(a)); if (x < bd) { bd = x; best = a } }
  return best
}
