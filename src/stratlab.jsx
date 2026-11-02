// ============================================================
// THE PART I STRATEGY LAB (Josh, 2026-11-02; BK's order in chat 07:41 "do that build now";
// destination ruled by Leo 2026-10-30 14:30 on BK's 14:30 word).
//
// BK's design, from May 2026, now on a screen: REVERSE MULTIPLE CHOICE. The correct answer is
// given on every question. The job is not to find it — it is to PROVE it, by marking the phrase
// in the passage that does the proving. One phrase, 12 words maximum.
//
// BK, in Sam's renderer: "Removing the right-vs-wrong stakes is the engine: kids try harder when
// there's no risk of being wrong." So there is NO check, NO key, NO verdict and NO score here.
// The paper version is marked for completion, never for accuracy, and the screen matches it: a kid
// marks a phrase and moves on. The hint is the only thing that ever opens.
//
// The marking surface is the Highlighter's (src/highlight.jsx, 2026-10-14, BK "yes" 09-26 15:19):
// tap a word, tap again to clear, drag with a mouse, or arrow keys and Space. One marker, not two
// or three, because there is one thing to find. Nothing is scored, kept or sent (canon §1, §8).
//
// EVERY STUDENT WORD ON THIS PAGE IS LIFTED, NOT AUTHORED. Question text is ast-parsed byte for
// byte out of Sam's blessed build script; stems and options are MC_BANK records; passages are
// already-blessed text matched to the same NYSED crop. The builder's own words are the block
// below, and they go to BK in the proof.
// ============================================================
import { useState, useMemo, useRef } from 'react'
import { tokensOf } from './highlight-check.mjs'

// Josh's words — every string here is the builder's, not the desk's. BK rules them.
export const STRATLAB_WORDS = {
  howMark: 'Tap the words that prove it. Tap a word again to clear it. With a mouse you can drag across words.',
  clear: 'Clear the highlight',
  hintBtn: 'Show the hint',
  words: n => `${n} ${n === 1 ? 'word' : 'words'}`,
  over: 'Over 12 — tighten it to one phrase.',
  recall: 'No passage on this one. Say your proof out loud, then check the hint.',
  comingHead: 'The passage is on its way',
  comingBody: 'This one is being typed up. Everything else on the question works now.',
  answerGiven: 'answer given',
  correct: 'Correct',
  target: m => `target ${m} min`,
  feeds: l => `feeds ${l}`,
  move: m => `Move: ${m}`,
}

// **bold** and *italic*, as the brief writes them. Presentation only — no words change.
function rich(text) {
  const out = []
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*/g
  let last = 0, m, k = 0
  while ((m = re.exec(String(text))) !== null) {
    if (m.index > last) out.push(String(text).slice(last, m.index))
    out.push(m[1] ? <b key={k++}>{m[1]}</b> : <em key={k++}>{m[2]}</em>)
    last = m.index + m[0].length
  }
  out.push(String(text).slice(last))
  return out
}

// The marking surface. No key, no check, no verdict — completion, not accuracy.
function ProofMark({ passage }) {
  const words = useMemo(() => tokensOf(passage?.text || ''), [passage])
  const [marks, setMarks] = useState({})
  const [cursor, setCursor] = useState(0)
  const paint = useRef(null)
  const ptype = useRef('mouse')
  const n = Object.keys(marks).length

  const set = (i, on) => setMarks(m => { const x = { ...m }; if (on) x[i] = true; else delete x[i]; return x })
  const toggle = i => setMarks(m => { const x = { ...m }; if (x[i]) delete x[i]; else x[i] = true; return x })
  const onKey = e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(words.length - 1, c + 1)) }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(0, c - 1)) }
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(cursor) }
  }

  return (
    <div className="sl-mark">
      <p className="mc-preamble">{STRATLAB_WORDS.howMark}</p>
      <figure className="stimulus sl-doc">
        <p className="hl-text" tabIndex={0} onKeyDown={onKey} aria-label={STRATLAB_WORDS.howMark}
           onPointerUp={() => { paint.current = null }} onPointerLeave={() => { paint.current = null }}>
          {words.map((w, i) => (
            <span key={i}>
              <span role="button" aria-pressed={!!marks[i]}
                    className={`hl-w${marks[i] ? ' hl-mark-solid' : ''}${i === cursor ? ' hl-cursor' : ''}`}
                    onPointerDown={e => {
                      ptype.current = e.pointerType
                      if (e.pointerType === 'touch') return
                      const on = !marks[i]; paint.current = { on }; set(i, on); setCursor(i)
                    }}
                    onPointerEnter={() => { if (paint.current) set(i, paint.current.on) }}
                    onClick={() => { if (ptype.current !== 'touch') return; toggle(i); setCursor(i) }}>
                {w.text}
              </span>{' '}
            </span>
          ))}
        </p>
        {passage.citation && <figcaption className="peel-cite">{passage.citation}</figcaption>}
      </figure>
      <div className="hl-row sl-count-row">
        <span className={`sl-count${n > 12 ? ' over' : ''}`} role="status">
          {STRATLAB_WORDS.words(n)}{n > 12 ? ` · ${STRATLAB_WORDS.over}` : ''}
        </span>
        {n > 0 && <button type="button" className="btn-ghost" onClick={() => setMarks({})}>{STRATLAB_WORDS.clear}</button>}
      </div>
    </div>
  )
}

function Question({ q, lineLabel }) {
  const [hint, setHint] = useState(false)
  // The brief's own headings: a passage is highlighted, a recall item is stated.
  const head = q.no_stimulus ? 'STATE YOUR PROOF' : 'HIGHLIGHT THE PROOF'
  const ask = q.no_stimulus
    ? 'In **one phrase, 12 words maximum,** name the specific rule, clause, or fact that makes this the correct answer.'
    : 'Mark the phrase in the passage that proves the correct answer. **One phrase, 12 words maximum.**'
  return (
    <section className="sl-q">
      <header className="sl-qhead">
        <h3>QUESTION {q.n} — {q.archetype}</h3>
        <p className="sl-qsub">
          {q.era} · {STRATLAB_WORDS.answerGiven} · {STRATLAB_WORDS.target(q.minutes)} · {q.frame} ·{' '}
          {STRATLAB_WORDS.move(q.move)} · {STRATLAB_WORDS.feeds(lineLabel(q.line) || q.line)}
        </p>
      </header>

      {q.passage && <div className="sl-passage"><ProofMark passage={q.passage} /></div>}
      {q.pending_crop && (
        <div className="empty sl-coming">
          <div className="empty-title">{STRATLAB_WORDS.comingHead}</div>
          <p>{STRATLAB_WORDS.comingBody}</p>
        </div>
      )}

      <dl className="sl-strategy">
        <dt>STRATEGY — {q.frame}</dt><dd>{rich(q.strategy)}</dd>
        <dt>THE MOVE</dt><dd><b>{q.move}.</b> {rich(q.watch)}</dd>
      </dl>

      <div className="sl-stem">{rich(q.stem)}</div>
      <ul className="sl-choices">
        {Object.keys(q.options).sort().map(k => (
          <li key={k} className={k === q.correct ? 'sl-choice right' : 'sl-choice'}>
            <b>({k})</b> <span>{q.options[k]}</span>
            {k === q.correct && <em className="mc-mark">{STRATLAB_WORDS.correct}</em>}
          </li>
        ))}
      </ul>

      <h4 className="sl-proofhead">{head}</h4>
      <p className="sl-ask">{rich(ask)}</p>
      {q.no_stimulus && !q.passage && <p className="sl-ask">{STRATLAB_WORDS.recall}</p>}
      {hint
        ? <p className="hint"><b>Hint</b> {rich(q.hint)}</p>
        : <button type="button" className="btn-ghost" onClick={() => setHint(true)}>{STRATLAB_WORDS.hintBtn}</button>}
    </section>
  )
}

export function StrategyLab({ pack, lineLabel }) {
  const items = pack?.items || []
  return (
    <div className="sl">
      <header className="sl-cover">
        <h2>{pack.title}</h2>
        <p className="sl-sub">{pack.sub}</p>
      </header>

      <h3 className="room-section">WHAT THIS IS</h3>
      {(pack.what_this_is || []).map((p, i) => <p key={i} className="sl-body">{rich(p)}</p>)}

      <h3 className="room-section">{pack.how_to_work?.head}</h3>
      <p className="sl-body sl-lead">{rich(pack.how_to_work?.lead || '')}</p>
      <ol className="sl-steps">
        {(pack.how_to_work?.steps || []).map((s, i) => <li key={i}>{rich(s)}</li>)}
      </ol>

      <h3 className="room-section">THE SIX QUESTION TYPES ON PART I</h3>
      <p className="sl-body">{rich(pack.types?.lead || '')}</p>
      <div className="sl-tablewrap">
        <table className="sl-table">
          <thead><tr>{(pack.types?.headers || []).map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
          <tbody>
            {(pack.types?.rows || []).map((r, i) => (
              <tr key={i}>{r.map((c, j) => <td key={j}>{j === 3 ? (lineLabel(c) || c) : c}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>

      {(pack.notes || []).map((nt, i) => (
        <div key={i} className="sl-note">
          <h4>{nt.head}</h4>
          {(nt.body || []).map((b, j) => <p key={j}>{rich(b)}</p>)}
        </div>
      ))}

      {items.map(q => <Question key={q.n} q={q} lineLabel={lineLabel} />)}

      <div className="sl-close">
        <h3>{pack.closing?.head}</h3>
        <p className="sl-sub">{pack.closing?.sub}</p>
        {(pack.closing?.body || []).map((b, i) => <p key={i} className="sl-body">{rich(b)}</p>)}
        {!!(pack.closing?.training || []).length && (
          <>
            <h4 className="sl-traininghead">{pack.closing?.training_head}</h4>
            <dl className="sl-training">
              {pack.closing.training.map((r, i) => (
                <div key={i}><dt>{rich(r[0])}</dt><dd>{rich(r[1])}</dd></div>
              ))}
            </dl>
          </>
        )}
      </div>
    </div>
  )
}

export const STRATLAB_STYLES = `
.sl{max-width:760px}
.sl-cover h2{margin-bottom:2px}
.sl-sub{color:var(--muted);margin:0 0 14px}
.sl-body{line-height:1.6;margin:0 0 10px}
.sl-lead{color:var(--muted)}
.sl-steps{line-height:1.6;padding-left:22px}
.sl-steps li{margin-bottom:8px}
.sl-tablewrap{overflow-x:auto;margin:6px 0 14px}
.sl-table{border-collapse:collapse;width:100%;font-size:15px}
.sl-table th,.sl-table td{border:1px solid var(--arena-choice-edge);padding:7px 9px;text-align:left;vertical-align:top}
.sl-table th{background:var(--arena-choice);font-family:'Barlow Condensed','Outfit',system-ui,sans-serif;letter-spacing:.03em}
.sl-note{border-left:4px solid var(--gold);background:var(--arena-choice);border-radius:0 10px 10px 0;padding:12px 14px;margin:14px 0}
.sl-note h4{margin:0 0 6px;font-family:'Barlow Condensed','Outfit',system-ui,sans-serif;letter-spacing:.03em}
.sl-note p{margin:0 0 8px;line-height:1.55}
.sl-note p:last-child{margin-bottom:0}
.sl-q{border-top:2px solid var(--arena-choice-edge);margin-top:30px;padding-top:18px}
.sl-qhead h3{margin:0 0 3px;font-family:'Barlow Condensed','Outfit',system-ui,sans-serif;letter-spacing:.03em}
.sl-qsub{color:var(--muted);font-size:14px;margin:0 0 12px;line-height:1.5}
.sl-strategy{margin:12px 0;display:grid;grid-template-columns:auto;gap:0}
.sl-strategy dt{font-family:'Barlow Condensed','Outfit',system-ui,sans-serif;letter-spacing:.03em;color:var(--gold);margin-top:8px}
.sl-strategy dd{margin:3px 0 0;line-height:1.55}
.sl-stem{font-weight:700;font-size:18px;line-height:1.5;margin:14px 0 8px}
.sl-choices{list-style:none;padding:0;margin:0 0 6px}
.sl-choice{background:var(--arena-choice);border:1.5px solid var(--arena-choice-edge);border-radius:9px;padding:10px 12px;margin-bottom:7px;line-height:1.5}
.sl-choice.right{border-color:var(--gold);box-shadow:inset 0 0 0 2px var(--gold)}
.sl-choice .mc-mark{margin-left:8px}
.sl-proofhead{margin:16px 0 4px;font-family:'Barlow Condensed','Outfit',system-ui,sans-serif;letter-spacing:.03em;color:var(--gold)}
.sl-ask{margin:0 0 10px;line-height:1.55}
.sl-count-row{margin-top:8px}
.sl-count{font-family:'Barlow Condensed','Outfit',system-ui,sans-serif;letter-spacing:.03em;color:var(--muted)}
.sl-count.over{color:#FF6A13}
.sl-doc{margin:0}
.sl-coming{text-align:left;margin:10px 0}
.sl-close{border-top:2px solid var(--arena-choice-edge);margin-top:32px;padding-top:18px}
.sl-traininghead{font-family:'Barlow Condensed','Outfit',system-ui,sans-serif;letter-spacing:.03em;margin:14px 0 6px}
.sl-training div{margin-bottom:10px}
.sl-training dt{font-weight:700}
.sl-training dd{margin:2px 0 0;color:var(--muted);line-height:1.5}
@media (max-width:480px){.sl-stem{font-size:17px}}
`
