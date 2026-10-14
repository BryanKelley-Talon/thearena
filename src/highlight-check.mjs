// The highlighter's word splitter and its checks (Josh, 2026-10-14). Shared by the page and the build gate.
// A word is a run of non-space characters; matching ignores case and the punctuation around a word.
export const norm = w => String(w).toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
export function tokensOf(text) { return String(text).split(/\s+/).filter(Boolean).map(t => ({ text: t, n: norm(t) })) }
// [start, end) word indexes of a phrase in the tokens, or null.
export function spanOf(tokens, phrase) {
  const p = tokensOf(phrase).map(t => t.n).filter(Boolean)
  if (!p.length) return null
  for (let i = 0; i + p.length <= tokens.length; i++) {
    let ok = true
    for (let j = 0; j < p.length; j++) if (tokens[i + j].n !== p[j]) { ok = false; break }
    if (ok) return [i, i + p.length]
  }
  return null
}
export function highlightProblems(pack) {
  const out = []
  const ids = new Set((pack?.markers || []).map(m => m.id))
  if (!pack?.text) out.push('needs the document text')
  if (!pack?.citation) out.push('the document needs its citation on screen')
  if ((pack?.markers || []).length < 2 || (pack?.markers || []).length > 3) out.push('two or three markers')
  for (const m of pack?.markers || []) if (!m.id || !m.label) out.push('every marker needs an id and a label')
  if (!(pack?.key || []).length) out.push('needs a key')
  const tokens = tokensOf(pack?.text || '')
  for (const k of pack?.key || []) {
    if (!ids.has(k.marker)) out.push(`key "${k.phrase}": marker ${k.marker} is not defined`)
    if (!k.why) out.push(`key "${k.phrase}": needs its why`)
    if (!String(pack?.text || '').includes(k.phrase)) out.push(`key "${k.phrase}": not found verbatim in the text`)
    else if (!spanOf(tokens, k.phrase)) out.push(`key "${k.phrase}": not found word for word`)
  }
  return out
}
