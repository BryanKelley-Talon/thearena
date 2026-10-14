// ============================================================
// THE PEEL BUILDER (Josh, 2026-10-14; work order 2026-09-26, BK "yes" 15:19; Global pilot BK 10/13 14:09).
// Four slots in order, labeled with the course's own words (pack.slots[].label, never hardcoded here),
// and a shuffled bank of cards: one right card per slot and decoys. Place one card in each slot,
// check, and each slot shows right or not with its reason; then the paragraph reads back as prose.
//
// Three ways in, all equal: drag a card onto a slot (mouse or pen), tap a card then tap a slot,
// or the keyboard (Tab to a card, Enter to pick it up, arrow keys between slots, Enter to drop).
// Right and wrong show by mark and words as well as colour. Nothing is scored, kept or sent:
// what a kid places is React state and is gone with the tab.
//
// Every word of history and every reason is the desk's (the pack). The few words below are the
// builder's own (PEEL_WORDS); they go to BK in the proof.
// ============================================================
import { useState, useMemo, useRef, useEffect } from 'react'

export const PEEL_WORDS = {
  how: 'Tap a card, then tap the slot it belongs in. You can also drag a card into a slot.',
  bank: 'Cards',
  empty: 'Empty',
  picked: 'Picked up. Now tap a slot.',
  check: 'Check my paragraph',
  fillFirst: n => `Fill every slot first: ${n} to go`,
  right: 'Correct',
  wrong: 'Not this one',
  retry: 'The cards marked “Not this one” go back to the pile. Your correct cards stay.',
  tryAgain: 'Try again',
  done: 'Your paragraph',
  remove: 'Take it out',
}

function shuffle(arr) {
  const a = [...(arr || [])]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

export function PeelBuild({ pack, onRep }) {
  const slots = pack?.slots || []
  const cards = pack?.cards || []
  const byId = useMemo(() => Object.fromEntries(cards.map(c => [c.id, c])), [pack])
  const [attempt, setAttempt] = useState(0)
  const order = useMemo(() => shuffle(cards.map(c => c.id)), [pack, attempt])
  const [placed, setPlaced] = useState({})      // slot -> card id
  const [held, setHeld] = useState(null)        // a card picked up by tap or keyboard
  const [checked, setChecked] = useState(false)
  const slotRefs = useRef([])

  const used = new Set(Object.values(placed))
  const bank = order.filter(id => !used.has(id))
  const ok = s => placed[s.slot] === s.correct
  const allFilled = slots.length > 0 && slots.every(s => placed[s.slot])
  const allRight = checked && slots.every(ok)

  const put = (slot, id) => {
    if (checked || !id) return
    setPlaced(p => {
      const n = Object.fromEntries(Object.entries(p).filter(([, v]) => v !== id))   // a card sits in one slot
      n[slot] = id
      return n
    })
    setHeld(null)
  }
  const takeOut = slot => { if (checked) return; setPlaced(p => { const n = { ...p }; delete n[slot]; return n }) }
  const check = () => { setChecked(true); onRep && onRep(slots.every(s => placed[s.slot] === s.correct)) }
  const tryAgain = () => {
    setPlaced(p => Object.fromEntries(Object.entries(p).filter(([slot, id]) => slots.find(s => s.slot === slot)?.correct === id)))
    setChecked(false); setHeld(null); setAttempt(a => a + 1)
  }
  // Why a slot is right or not: a decoy made for this slot says its own why_not; otherwise the slot's reason.
  const reasonFor = s => {
    const c = byId[placed[s.slot]]
    if (!ok(s) && c && c.why_not && (!c.decoy_for || c.decoy_for === s.slot)) return c.why_not
    return s.rationale
  }

  // Drag with a mouse or pen. Touch uses tap, so a phone still scrolls.
  const drag = useRef(null)
  const [ghost, setGhost] = useState(null)
  const onDown = (e, id) => {
    if (checked || e.pointerType === 'touch' || e.button !== 0) return
    drag.current = { id, x: e.clientX, y: e.clientY, on: false }
  }
  useEffect(() => {
    const move = e => {
      const d = drag.current; if (!d) return
      if (!d.on && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) d.on = true
      if (d.on) setGhost({ id: d.id, x: e.clientX, y: e.clientY })
      // The slots sit above the pile: near the top or bottom edge, the page scrolls while you drag.
      if (d.on) {
        const edge = 70, step = 14
        clearInterval(d.timer)
        const dir = e.clientY < edge ? -1 : e.clientY > window.innerHeight - edge ? 1 : 0
        if (dir) d.timer = setInterval(() => window.scrollBy(0, dir * step), 16)
      }
    }
    const up = e => {
      const d = drag.current; drag.current = null
      if (d) clearInterval(d.timer)
      if (!d || !d.on) return
      setGhost(null)
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-peel-slot]')
      if (el) put(el.getAttribute('data-peel-slot'), d.id)
      window.__peelDragged = Date.now()
    }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
  })
  const justDragged = () => Date.now() - (window.__peelDragged || 0) < 250

  const onSlotKey = (e, i) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); slotRefs.current[(i + 1) % slots.length]?.focus() }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); slotRefs.current[(i - 1 + slots.length) % slots.length]?.focus() }
  }

  return (
    <div className="peel">
      {pack.before_we_talk && <p className="peel-talk">{pack.before_we_talk}</p>}
      {pack.intro && <p className="mc-preamble">{pack.intro}</p>}
      {pack.prompt && <p className="peel-prompt">{pack.prompt}</p>}
      {pack.source_text && (
        <figure className="stimulus peel-doc">
          {pack.source_document && <div className="doc-tag">{pack.source_document}</div>}
          {String(pack.source_text).split('\n').map((l, i) => <p key={i}>{l}</p>)}
          {(pack.citation || pack.source_line) && <figcaption className="peel-cite">{pack.citation || pack.source_line}</figcaption>}
        </figure>
      )}

      <p className="mc-preamble">{PEEL_WORDS.how}</p>
      <ol className="peel-slots" aria-live="polite">
        {slots.map((s, i) => {
          const c = byId[placed[s.slot]]
          const mark = checked ? (ok(s) ? 'ok' : 'miss') : ''
          return (
            <li key={s.slot} className={`peel-slot ${c ? 'filled' : ''} ${mark}`} data-peel-slot={s.slot}>
              <button type="button" ref={el => (slotRefs.current[i] = el)} className="peel-target"
                      onKeyDown={e => onSlotKey(e, i)}
                      onClick={() => { if (justDragged()) return; if (held) put(s.slot, held) }}
                      aria-label={`${s.label}: ${c ? c.text : PEEL_WORDS.empty}`}>
                <span className="peel-label">{i + 1} · {s.label}</span>
                <span className="peel-card-text">{c ? c.text : PEEL_WORDS.empty}</span>
              </button>
              {c && !checked && <button type="button" className="btn-ghost peel-out" onClick={() => takeOut(s.slot)}>{PEEL_WORDS.remove}</button>}
              {checked && (
                <p className={`peel-why ${mark}`}>
                  <em className={`mc-mark ${mark}`}>{ok(s) ? `✓ ${PEEL_WORDS.right}` : `✗ ${PEEL_WORDS.wrong}`}</em> {reasonFor(s)}
                </p>
              )}
            </li>
          )
        })}
      </ol>

      {!checked && (
        <>
          <h4 className="peel-bank-head">{PEEL_WORDS.bank}</h4>
          {held && <p className="peel-held" role="status">{PEEL_WORDS.picked}</p>}
          <div className="peel-bank">
            {bank.map(id => (
              <button key={id} type="button" aria-pressed={held === id}
                      className={`tile peel-tile${held === id ? ' on' : ''}`}
                      onPointerDown={e => onDown(e, id)}
                      onClick={() => { if (justDragged()) return; setHeld(h => (h === id ? null : id)); if (held !== id) setTimeout(() => slotRefs.current[slots.findIndex(s => !placed[s.slot])]?.focus(), 0) }}>
                {byId[id].text}
              </button>
            ))}
          </div>
          <button type="button" className="rep-go" disabled={!allFilled} onClick={check}>
            {allFilled ? PEEL_WORDS.check : PEEL_WORDS.fillFirst(slots.length - Object.keys(placed).length)}
          </button>
        </>
      )}
      {checked && !allRight && (
        <div className="rep-reveal">
          <p className="mc-preamble">{PEEL_WORDS.retry}</p>
          <button type="button" className="rep-go" onClick={tryAgain}>{PEEL_WORDS.tryAgain}</button>
        </div>
      )}
      {allRight && (
        <div className="rep-reveal" role="status">
          <h4>{PEEL_WORDS.done}</h4>
          <p className="rep-exemplar">{slots.map(s => byId[s.correct]?.text).join(' ')}</p>
          {pack.model_note && <p className="mc-why">{pack.model_note}</p>}
        </div>
      )}
      {ghost && <div className="peel-ghost" style={{ left: ghost.x + 8, top: ghost.y + 8 }} aria-hidden="true">{byId[ghost.id]?.text}</div>}
    </div>
  )
}

export { peelProblems } from './peel-check.mjs'

export const PEEL_STYLES = `
.peel-talk{border-left:4px solid var(--gold);background:var(--card);padding:10px 14px;border-radius:8px;font-weight:600;line-height:1.45}
.peel-prompt{font-size:20px;font-weight:700;line-height:1.35;margin:10px 0 12px}
.peel-doc p{margin:0 0 8px}
.peel-cite{font-size:13.5px;font-style:italic;margin-top:10px;color:#4a3c22}
.peel-slots{list-style:none;padding:0;margin:8px 0 16px;display:flex;flex-direction:column;gap:10px}
.peel-slot{border:1.5px dashed var(--arena-choice-edge);border-radius:10px;padding:8px;background:var(--card)}
.peel-slot.filled{border-style:solid}
.peel-slot.ok{border-color:#7FCFA0;border-width:2px}
.peel-slot.miss{border-color:#E08C82;border-width:2px;border-style:dotted}
.peel-target{display:block;width:100%;text-align:left;background:none;border:0;color:var(--white);padding:6px 8px;cursor:pointer;font:inherit;min-height:52px;border-radius:8px}
.peel-target:focus-visible{outline:3px solid var(--gold);outline-offset:2px}
.peel-label{display:block;font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.12em;font-size:13px;color:var(--gold);margin-bottom:3px}
.peel-card-text{display:block;font-size:17px;line-height:1.45}
.peel-slot:not(.filled) .peel-card-text{color:var(--grey);font-style:italic}
.peel-out{margin:4px 8px 4px;font-size:14px}
.peel-why{margin:6px 8px 4px;line-height:1.45}
.peel-why .mc-mark{margin:0 6px 0 0;padding:0;font-weight:700}
.peel-bank-head{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.12em;color:var(--gold);margin:6px 0}
.peel-held{color:var(--gold-lit);font-weight:600;margin:0 0 6px}
.peel-bank{display:flex;flex-direction:column;gap:8px}
.peel-tile{text-align:left;font-size:16.5px;line-height:1.4;cursor:grab;transition:transform .15s ease-out,box-shadow .15s ease-out}
.peel-tile.on{transform:translateY(-2px);box-shadow:0 6px 14px -6px #000c,inset 0 0 0 2px var(--gold)}
.peel-ghost{position:fixed;z-index:50;max-width:340px;pointer-events:none;background:var(--arena-choice);border:2px solid var(--gold);border-radius:9px;padding:9px 12px;color:var(--white);font-size:15px;box-shadow:0 10px 24px -8px #000}
@media (prefers-reduced-motion: reduce){.peel-tile{transition:none}.peel-tile.on{transform:none}}
`
