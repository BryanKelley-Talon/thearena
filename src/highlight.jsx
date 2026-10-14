// ============================================================
// THE HIGHLIGHTER (Josh, 2026-10-14; work order 2026-09-26, BK "yes" 15:19; Global pilot BK 10/13 14:09).
// One document and two or three highlighters (labels from the pack). Mark words, tap Check, and the
// author's key shows: each key phrase is found when at least 60% of its words carry the right
// highlighter (a teaching check, not a grade), with the author's one-line why.
//
// Three ways to mark, all equal: tap a word to toggle it; press and drag across words (mouse or pen);
// or the keyboard (focus the document, arrow keys move word by word, Space marks). Every highlighter has
// a pattern as well as a colour (solid, dotted), so meaning never rests on colour alone.
// Nothing is scored, kept or sent. The few words below are the builder's own; they go to BK in the proof.
// ============================================================
import { useState, useMemo, useRef } from 'react'
import { tokensOf, spanOf } from './highlight-check.mjs'

export const HL_WORDS = {
  how: 'Pick a highlighter, then tap words to mark them. Tap a marked word again to clear it. With a mouse you can drag across words.',
  pick: 'Highlighter',
  check: 'Check',
  markFirst: 'Mark some words first',
  found: 'Found',
  missed: 'Not yet',
  key: 'The key',
  tryAgain: 'Try again',
  clear: 'Clear my marks',
}
const PATTERNS = ['solid', 'dotted', 'dashed']

export function Highlight({ pack, onRep }) {
  const words = useMemo(() => tokensOf(pack?.text || ''), [pack])
  const markers = pack?.markers || []
  const key = pack?.key || []
  const spans = useMemo(() => key.map(k => ({ ...k, at: spanOf(words, k.phrase) })), [pack, words])
  const [pen, setPen] = useState(markers[0]?.id || null)
  const [marks, setMarks] = useState({})        // word index -> marker id
  const [checked, setChecked] = useState(false)
  const [cursor, setCursor] = useState(0)
  const paint = useRef(null)                    // { to: marker id or null } while a mouse drag paints
  const ptype = useRef('mouse')                 // a finger taps (click); a mouse or pen paints on press, so a finger can still scroll

  const style = id => PATTERNS[Math.max(0, markers.findIndex(m => m.id === id)) % PATTERNS.length]
  const toggle = i => { if (checked) return; setMarks(m => { const n = { ...m }; if (n[i] === pen) delete n[i]; else n[i] = pen; return n }) }
  const set = (i, to) => setMarks(m => { const n = { ...m }; if (to) n[i] = to; else delete n[i]; return n })
  const found = s => {
    if (!s.at) return false
    const [a, b] = s.at; let hit = 0
    for (let i = a; i < b; i++) if (marks[i] === s.marker) hit++
    return hit / (b - a) >= 0.6
  }
  const inKey = i => spans.find(s => s.at && i >= s.at[0] && i < s.at[1])
  const any = Object.keys(marks).length > 0
  const check = () => { setChecked(true); onRep && onRep(spans.every(found)) }

  const onKey = e => {
    if (checked) return
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(words.length - 1, c + 1)) }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(0, c - 1)) }
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(cursor) }
  }

  return (
    <div className="hl">
      {pack.before_we_talk && <p className="peel-talk">{pack.before_we_talk}</p>}
      {pack.intro && <p className="mc-preamble">{pack.intro}</p>}
      <p className="mc-preamble">{HL_WORDS.how}</p>

      <div className="hl-pens" role="radiogroup" aria-label={HL_WORDS.pick}>
        {markers.map(m => (
          <button key={m.id} type="button" role="radio" aria-checked={pen === m.id} disabled={checked}
                  className={`hl-pen hl-${style(m.id)}${pen === m.id ? ' on' : ''}`} onClick={() => setPen(m.id)}>
            <span className={`hl-sample hl-mark-${style(m.id)}`}>{m.label}</span>
          </button>
        ))}
      </div>

      <figure className="stimulus hl-doc">
        {pack.source_document && <div className="doc-tag">{pack.source_document}</div>}
        <p className="hl-text" tabIndex={0} onKeyDown={onKey} aria-label={`${pack.source_document || ''}. ${HL_WORDS.how}`}
           onPointerUp={() => { paint.current = null }} onPointerLeave={() => { paint.current = null }}>
          {words.map((w, i) => {
            const mk = marks[i], ks = checked ? inKey(i) : null
            return (
              <span key={i}>
                <span role="button" aria-pressed={!!mk}
                      className={`hl-w${mk ? ` hl-mark-${style(mk)} hl-${mk}` : ''}${!checked && i === cursor ? ' hl-cursor' : ''}${ks ? ` hl-key hl-key-${style(ks.marker)}` : ''}`}
                      onPointerDown={e => { ptype.current = e.pointerType; if (checked || e.pointerType === 'touch') return; const to = marks[i] === pen ? null : pen; paint.current = { to }; set(i, to); setCursor(i) }}
                      onPointerEnter={() => { if (paint.current) set(i, paint.current.to) }}
                      onClick={() => { if (ptype.current !== 'touch') return; toggle(i); setCursor(i) }}>
                  {w.text}
                </span>{' '}
              </span>
            )
          })}
        </p>
        {pack.citation && <figcaption className="peel-cite">{pack.citation}</figcaption>}
      </figure>

      {!checked && (
        <div className="hl-row">
          <button type="button" className="rep-go" disabled={!any} onClick={check}>{any ? HL_WORDS.check : HL_WORDS.markFirst}</button>
          {any && <button type="button" className="btn-ghost" onClick={() => setMarks({})}>{HL_WORDS.clear}</button>}
        </div>
      )}
      {checked && (
        <div className="rep-reveal" role="status">
          <h4>{HL_WORDS.key}</h4>
          <ol className="hl-keylist">
            {spans.map((s, i) => {
              const ok = found(s), m = markers.find(x => x.id === s.marker)
              return (
                <li key={i} className={ok ? 'ok' : 'miss'}>
                  <em className={`mc-mark ${ok ? 'ok' : 'miss'}`}>{ok ? `✓ ${HL_WORDS.found}` : `✗ ${HL_WORDS.missed}`}</em>{' '}
                  <span className={`hl-sample hl-mark-${style(s.marker)}`}>{m?.label}</span>{' '}
                  <q>{s.phrase}</q>
                  <span className="hl-why">{s.why}</span>
                </li>
              )
            })}
          </ol>
          <button type="button" className="rep-go" onClick={() => { setChecked(false); setMarks({}) }}>{HL_WORDS.tryAgain}</button>
        </div>
      )}
    </div>
  )
}

export const HL_STYLES = `
.hl-pens{display:flex;gap:10px;flex-wrap:wrap;margin:8px 0 12px}
.hl-pen{background:var(--arena-choice);border:1.5px solid var(--arena-choice-edge);border-radius:9px;padding:9px 14px;min-height:44px;cursor:pointer;color:var(--white);font:inherit}
.hl-pen.on{border-color:var(--gold);box-shadow:inset 0 0 0 2px var(--gold)}
.hl-pen:disabled{opacity:.6;cursor:default}
.hl-text{font-size:19px;line-height:2.05;margin:0;user-select:none;-webkit-user-select:none}
.hl-text:focus-visible{outline:3px solid var(--gold);outline-offset:6px;border-radius:4px}
.hl-w{cursor:pointer;border-radius:3px;padding:1px 0}
.hl-cursor{box-shadow:0 0 0 2px #2c2110 inset}
.hl-text:not(:focus-within) .hl-cursor{box-shadow:none}
.hl-mark-solid{background:#F6D86B;text-decoration:underline;text-decoration-thickness:3px;text-underline-offset:4px;text-decoration-style:solid;text-decoration-color:#6b4d00;color:#1d1a12}
.hl-mark-dotted{background:#A8D5F2;text-decoration:underline;text-decoration-thickness:3px;text-underline-offset:4px;text-decoration-style:dotted;text-decoration-color:#0b3d66;color:#10202e}
.hl-mark-dashed{background:#C9E8B8;text-decoration:underline;text-decoration-thickness:3px;text-underline-offset:4px;text-decoration-style:dashed;text-decoration-color:#1e5b16;color:#13240f}
.hl-sample{padding:1px 6px;border-radius:3px;font-weight:700}
.hl-key{outline:2px solid #2c2110;outline-offset:1px}
.hl-key-dotted{outline-style:dotted}
.hl-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.hl-keylist{padding-left:20px;line-height:1.5}
.hl-keylist li{margin-bottom:10px}
.hl-keylist q{font-style:italic}
.hl-why{display:block;margin-top:2px}
`
