// Desk-content check (format only), for the build gate.
export function peelProblems(pack) {
  const out = []
  const ids = new Set((pack?.cards || []).map(c => c.id))
  if (!pack?.prompt) out.push('needs a prompt')
  if (!(pack?.slots || []).length) out.push('needs slots')
  for (const s of pack?.slots || []) {
    if (!s.slot || !s.label || !s.rationale) out.push(`slot ${s.slot || '?'}: slot, label and rationale`)
    if (!ids.has(s.correct)) out.push(`slot ${s.slot}: its correct card "${s.correct}" isn't in cards`)
  }
  if ((pack?.cards || []).length !== ids.size) out.push('card ids must be unique')
  for (const c of pack?.cards || []) if (c.decoy_for && !(pack.slots || []).some(s => s.slot === c.decoy_for)) out.push(`card ${c.id}: decoy_for names no slot`)
  if (pack?.source_document && !pack?.source_text) out.push('names a document, so it needs source_text on screen')
  if (pack?.source_text && !(pack?.citation || pack?.source_line)) out.push('a document needs its citation on screen')
  return out
}

