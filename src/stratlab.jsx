// ============================================================
// THE PART I STRATEGY LAB — read-only coaching view (Josh, 2026-11-03).
//
// BK, 2026-11-03 08:51, after playing the interactive version as a student: the marking
// mechanic "is clunky and it's not going to help a kid." 09:03: "take away the student
// interaction ... i need them to just be able to see the whole question/stimulus and the
// answer choices and the right answer with an explanation of why it is and specific
// highlights in the document already done that prove it ... basically coach them through
// each question." 09:08: "retire it."  10:13/10:18: it is a resource, optional, not an
// assignment; Strategy and Hint come off the screen; Watch stays; minutes dropped.
//
// So this screen has NOTHING to tap, drag, type, keep or score. A kid scrolls. Per question,
// in order: number, type, Frame, Move, skill line -> the passage with the proof already
// marked -> the question and its four choices, the right one shown -> WHY IT'S RIGHT ->
// WATCH FOR. No state, no storage, no handlers. (The tap-a-word marker, src/highlight.jsx,
// is not used here.)
//
// EVERY STUDENT WORD ON THIS PAGE IS LIFTED, NOT AUTHORED, except the few builder's words in
// STRATLAB_WORDS below. The proof spans and the WHY lines are Sam's (BLESSED by BK 10:13,
// Danny COUNT 49-1-0). A span that is not found in its passage exactly once fails the build
// (scripts/gate-content.mjs), so a missing or doubled highlight cannot ship.
// ============================================================

// Josh's words — every string here is the builder's, not the desk's. BK rules them.
export const STRATLAB_WORDS = {
  correct: 'Correct',
  why: "WHY IT'S RIGHT",
  watch: 'WATCH FOR',
  recall: 'No passage on this one. It is a recall question, so the explanation below does all the work.',
  comingHead: 'The passage is on its way',
  comingBody: 'This one is being typed up. Everything else on the question works now.',
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

// Cut the passage into plain and proof pieces. The gate guarantees each span is found exactly
// once; if one were ever missing here the passage still shows whole, with no mark, never blank.
function pieces(text, spans) {
  const found = (spans || [])
    .map(s => ({ s, at: text.indexOf(s) }))
    .filter(x => x.at >= 0)
    .sort((a, b) => a.at - b.at)
  const out = []
  let pos = 0
  for (const { s, at } of found) {
    if (at < pos) continue // overlapping spans never double-print words
    if (at > pos) out.push({ t: text.slice(pos, at), mark: false })
    out.push({ t: s, mark: true })
    pos = at + s.length
  }
  if (pos < text.length) out.push({ t: text.slice(pos), mark: false })
  return out
}

function Passage({ passage, spans }) {
  return (
    <figure className="stimulus sl-doc">
      <p className="sl-passage-text">
        {pieces(passage.text || '', spans).map((p, i) =>
          p.mark ? <mark key={i} className="sl-proof">{p.t}</mark> : <span key={i}>{p.t}</span>)}
      </p>
      {passage.citation && <figcaption className="peel-cite">{passage.citation}</figcaption>}
    </figure>
  )
}

function Question({ q, lineLabel }) {
  return (
    <section className="sl-q">
      <header className="sl-qhead">
        <h3>QUESTION {q.n} — {q.archetype}</h3>
        <p className="sl-qsub">
          {q.era} · {q.frame} · {STRATLAB_WORDS.move(q.move)} · {STRATLAB_WORDS.feeds(lineLabel(q.line) || q.line)}
        </p>
      </header>

      {q.passage && <div className="sl-passage"><Passage passage={q.passage} spans={q.spans} /></div>}
      {q.no_stimulus && !q.passage && <p className="sl-ask">{STRATLAB_WORDS.recall}</p>}
      {q.pending_crop && (
        <div className="empty sl-coming">
          <div className="empty-title">{STRATLAB_WORDS.comingHead}</div>
          <p>{STRATLAB_WORDS.comingBody}</p>
        </div>
      )}

      <div className="sl-stem">{rich(q.stem)}</div>
      <ul className="sl-choices">
        {Object.keys(q.options).sort().map(k => (
          <li key={k} className={k === q.correct ? 'sl-choice right' : 'sl-choice'}>
            <b>({k})</b> <span>{q.options[k]}</span>
            {k === q.correct && <em className="mc-mark">{STRATLAB_WORDS.correct}</em>}
          </li>
        ))}
      </ul>

      <h4 className="sl-proofhead">{STRATLAB_WORDS.why}</h4>
      <p className="sl-explain">{rich(q.why)}</p>
      <h4 className="sl-proofhead">{STRATLAB_WORDS.watch}</h4>
      <p className="sl-explain">{rich(q.watch)}</p>
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
.sl-doc{margin:0}
.sl-passage-text{white-space:pre-line;line-height:1.7;margin:0}
.sl-proof{background:#F6D86B;color:#1d1a12;font-weight:700;padding:1px 2px;border-radius:2px;text-decoration:underline;text-decoration-thickness:3px;text-underline-offset:4px;text-decoration-color:#6b4d00;-webkit-box-decoration-break:clone;box-decoration-break:clone}
.sl-stem{font-weight:700;font-size:18px;line-height:1.5;margin:14px 0 8px}
.sl-choices{list-style:none;padding:0;margin:0 0 6px}
.sl-choice{background:var(--arena-choice);border:1.5px solid var(--arena-choice-edge);border-radius:9px;padding:10px 12px;margin-bottom:7px;line-height:1.5}
.sl-choice.right{border-color:var(--gold);box-shadow:inset 0 0 0 2px var(--gold)}
.sl-choice .mc-mark{margin-left:8px}
.sl-proofhead{margin:16px 0 4px;font-family:'Barlow Condensed','Outfit',system-ui,sans-serif;letter-spacing:.03em;color:var(--gold)}
.sl-ask{margin:0 0 10px;line-height:1.55}
.sl-explain{margin:0 0 10px;line-height:1.6}
.sl-coming{text-align:left;margin:10px 0}
.sl-close{border-top:2px solid var(--arena-choice-edge);margin-top:32px;padding-top:18px}
.sl-traininghead{font-family:'Barlow Condensed','Outfit',system-ui,sans-serif;letter-spacing:.03em;margin:14px 0 6px}
.sl-training div{margin-bottom:10px}
.sl-training dt{font-weight:700}
.sl-training dd{margin:2px 0 0;color:var(--muted);line-height:1.5}
@media (max-width:480px){.sl-stem{font-size:17px}}
`
