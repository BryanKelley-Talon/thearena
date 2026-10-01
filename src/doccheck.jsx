// ============================================================
// THE DOC CHECK — test practice with proof (US 11.1 first).
// Built by Josh 2026-09-30 on Leo's order of 14:08 (BK 14:07) from Sam's
// v2 brief (BK blessed 22:23). Phase 1 of two: answer it, then choose the
// proof, and the proof lights up in place in the document.
//
// Every word a student reads comes from the authoring desk's pack, except the
// chrome lines BK approved in chat at 22:28 ("yes. build now."). Those live in
// CHROME below so a later ruling changes one place.
//
// The fade (BK 22:17: "the first one is heavily supported and we fade from
// there"): each item carries `support` — walk · show · tuck · none — and the
// pack carries the checklist. Hints show at every level (Sam, v2).
//
// Same laws as every Arena set: the document stays on screen for every step,
// nothing reads as a score, nothing is stored. Order and answers live in this
// component's memory only and are gone when the tab closes (canon §1).
// ============================================================
import { useMemo, useRef, useState } from 'react'

export const CHROME = {
  top: 'Run the MC Evidence Finder, answer the question, then find the words in the document that prove it. Nothing here is scored or saved.',
  nextStep: 'Next step',
  openCheck: 'Open the MC Evidence Finder',   // BK 10-01 10:22: "MC Evidence Finder"
  hint1: 'Show a hint',
  hint2: 'Show the second hint',
  step1: '1 · Answer it',
  right1: 'Correct.',
  miss1: k => `Not quite. The right answer is ${k}.`,
  step2: '2 · Choose the proof',
  ask2Text: 'Which words from the document prove the right answer?',
  ask2Image: 'Which part of the picture proves the right answer?',
  right2: 'Correct.',
  miss2: 'Not this one. The proof is highlighted in the document.',
}

const IMG = 'IMAGE · '
const isImageOpt = s => typeof s === 'string' && s.startsWith(IMG)
const stripImg = s => (isImageOpt(s) ? s.slice(IMG.length) : s)

function shuffled(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// A source line that carries two documents reads "Document 1: … · Document 2: …".
// The label moves into the document's tag; the words are unchanged.
function splitCitations(src) {
  return String(src || '').split(' · ').map(s => {
    const m = s.match(/^Document (\d+):\s*(.*)$/)
    return m ? { label: `Document ${m[1]}`, text: m[2] } : { label: null, text: s }
  })
}

// Lay a stimulus out as the documents a kid sees. Text, image, or text + image;
// a text that carries ' ‖ ' is two documents (Sam's v1 memo).
function docsOf(stim) {
  const cites = splitCitations(stim.src)
  if (stim.kind === 'image') {
    return [{ kind: 'image', image_ref: stim.image_ref, image_alt: stim.image_alt, cites }]
  }
  if (stim.kind === 'text+image') {
    return [
      { kind: 'text', text: stim.text, cites: [cites[0]], label: cites[0]?.label },
      { kind: 'image', image_ref: stim.image_ref, image_alt: stim.image_alt, cites: [cites[1]], label: cites[1]?.label },
    ]
  }
  const parts = String(stim.text || '').split(' ‖ ')
  if (parts.length > 1) return parts.map((t, i) => ({ kind: 'text', text: t, cites: [cites[i]], label: cites[i]?.label }))
  return [{ kind: 'text', text: stim.text, cites }]
}

// Mark one exact span in place. Meaning is never colour alone: the mark is
// underlined and bold, and a "Proof" tag follows it.
function Marked({ text, span, on }) {
  if (!on || !span) return <>{text}</>
  const at = text.indexOf(span)
  if (at < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, at)}
      <mark className="dc-mark">{span}</mark>
      <span className="dc-mark-tag" aria-hidden="true">Proof</span>
      {text.slice(at + span.length)}
    </>
  )
}

function DocView({ doc, proof, lit, boxes, accent }) {
  return (
    <figure className="stimulus dc-doc" style={{ borderColor: `${accent}44` }}>
      {doc.label && <div className="doc-tag">{doc.label}</div>}
      {doc.kind === 'image'
        ? (
          <div className="dc-imgwrap">
            {/* Tap the picture to see it full size (phones shrink a two-picture pair hard). */}
            <a href={`/content/${doc.image_ref}`} target="_blank" rel="noopener noreferrer" className="dc-imglink">
              <img src={`/content/${doc.image_ref}`} alt={doc.image_alt || ''} loading="lazy" />
            </a>
            {lit && (boxes || []).map((b, i) => (
              <div key={i} className="dc-box" role="img" aria-label={`Proof: ${b.label}`}
                   style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%` }}>
                <span className="dc-box-tag">Proof</span>
              </div>
            ))}
          </div>
        )
        : <p className="dc-text"><Marked text={doc.text} span={proof} on={lit} /></p>}
      {(doc.cites || []).filter(Boolean).map((c, i) => (
        <figcaption key={i}><Marked text={c.text} span={proof} on={lit} /></figcaption>
      ))}
    </figure>
  )
}

function Checklist({ pack, mode, walkStep, walkLines, onNext }) {
  const steps = pack.checklist || []
  const title = pack.checklist_name || ''
  const body = (upto, withLines) => (
    <ol className="dc-steps">
      {steps.slice(0, upto).map((s, i) => (
        <li key={i} className={withLines && i === upto - 1 ? 'dc-step now' : 'dc-step'}>
          <b>{s.step}</b> <span>{s.say}</span>
          {withLines && walkLines?.[i] && <p className="dc-walk-line">{walkLines[i]}</p>}
        </li>
      ))}
    </ol>
  )
  if (mode === 'walk') {
    return (
      <aside className="dc-check" aria-live="polite">
        <div className="dc-check-title">{title}</div>
        {body(walkStep, true)}
        {walkStep < steps.length && (
          <button type="button" className="btn-ghost dc-next-step" onClick={onNext}>{CHROME.nextStep}</button>
        )}
      </aside>
    )
  }
  if (mode === 'show') {
    return (
      <aside className="dc-check">
        <div className="dc-check-title">{title}</div>
        {body(steps.length, false)}
      </aside>
    )
  }
  if (mode === 'tuck') {
    return (
      <details className="dc-check dc-tuck">
        <summary>{CHROME.openCheck}</summary>
        <div className="dc-check-title">{title}</div>
        {body(steps.length, false)}
      </details>
    )
  }
  return null
}

function Item({ pack, item, n, total, accent, st, set, order }) {
  const stim = pack.stimuli?.[item.stimulus] || {}
  const docs = docsOf(stim)
  const support = item.support || 'none'
  const steps = (pack.checklist || []).length
  const walkStep = st.walk ?? 1
  const walking = support === 'walk' && walkStep < steps
  const answered = st.picked != null
  const right = answered && st.picked === item.key
  const proofDone = st.proofPick != null
  const proofRight = proofDone && st.proofPick === item.proof
  const imageItem = isImageOpt(item.proof)
  const hints = item.hints || []
  const shown = st.hints || 0
  const hasCheck = support !== 'none'

  return (
    <div className="mc-item dc-item">
      <div className="mc-head"><span className="mc-count">Question {n} of {total}</span></div>
      <h4 className="dc-stephead">{CHROME.step1}</h4>
      <div className="mc-q">{item.stem}</div>

      {/* A picture-only document takes the full width; the checklist sits under it. */}
      <div className={hasCheck ? (stim.kind === 'image' ? 'dc-grid dc-wide' : 'dc-grid') : undefined}>
        <div className="dc-docs">
          {docs.map((d, i) => (
            <DocView key={i} doc={d} proof={item.proof} lit={proofDone} boxes={item.proof_boxes} accent={accent} />
          ))}
        </div>
        {hasCheck && (
          <Checklist pack={pack} mode={support} walkStep={walkStep} walkLines={item.walk_lines}
                     onNext={() => set({ walk: Math.min(steps, walkStep + 1) })} />
        )}
      </div>

      {!walking && (
        <>
          <div className="mc-choices">
            {(item.choices || []).map((c, i) => {
              const k = i + 1
              let cls = 'mc-choice'
              if (answered) cls += k === item.key ? ' correct' : k === st.picked ? ' incorrect' : ' dim'
              return (
                <button key={k} type="button" className={cls} disabled={answered}
                        onClick={() => { if (!answered) set({ picked: k }, k === item.key) }}>
                  <b>{k}.</b> <span>{stripImg(c)}</span>
                  {answered && k === item.key && <em className="mc-mark">Correct</em>}
                  {answered && k === st.picked && !right && <em className="mc-mark">Not this one</em>}
                </button>
              )
            })}
          </div>
          {!answered && hints.length > 0 && (
            <div className="hints">
              {hints.slice(0, shown).map((h, i) => <p key={i} className="hint"><b>Hint {i + 1}</b> {h}</p>)}
              {shown < hints.length && (
                <button type="button" className="btn-ghost" onClick={() => set({ hints: shown + 1 })}>
                  {shown === 0 ? CHROME.hint1 : CHROME.hint2}
                </button>
              )}
            </div>
          )}
        </>
      )}

      {answered && (
        <>
          <p className="mc-reasoning dc-verdict">{right ? CHROME.right1 : CHROME.miss1(item.key)}</p>
          <section className="dc-proof">
            <h4 className="dc-stephead">{CHROME.step2}</h4>
            <p className="dc-ask">{imageItem ? CHROME.ask2Image : CHROME.ask2Text}</p>
            <div className="mc-choices">
              {order.map((opt, i) => {
                let cls = 'mc-choice dc-opt'
                if (proofDone) cls += opt === item.proof ? ' correct' : opt === st.proofPick ? ' incorrect' : ' dim'
                return (
                  <button key={i} type="button" className={cls} disabled={proofDone}
                          onClick={() => { if (!proofDone) set({ proofPick: opt }) }}>
                    <span>{imageItem ? stripImg(opt) : <>&ldquo;{opt}&rdquo;</>}</span>
                    {proofDone && opt === item.proof && <em className="mc-mark">Correct</em>}
                    {proofDone && opt === st.proofPick && !proofRight && <em className="mc-mark">Not this one</em>}
                  </button>
                )
              })}
            </div>
            {proofDone && (
              <div className="mc-reveal">
                <p className="mc-reasoning dc-verdict">{proofRight ? CHROME.right2 : CHROME.miss2}</p>
                <p className="dc-feedback">{item.feedback}</p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

// One question at a time, so the document, the checklist and the choices share
// one screen. Back and forth keep what the kid did (this tab only).
export function DocCheckSet({ pack, accent, onAnswer, Coach }) {
  const items = (pack && pack.items) || []
  const [i, setI] = useState(0)
  const [state, setState] = useState({})
  const top = useRef(null)
  const orders = useMemo(() => Object.fromEntries(items.map(it => [it.n, shuffled([it.proof, ...(it.decoys || [])])])), [pack])
  if (!items.length) return null
  const item = items[i]
  const st = state[item.n] || {}
  const set = (patch, ok) => {
    setState(s => ({ ...s, [item.n]: { ...(s[item.n] || {}), ...patch } }))
    if ('picked' in patch) onAnswer?.(ok, i)
  }
  const go = d => {
    setI(x => Math.max(0, Math.min(items.length - 1, x + d)))
    requestAnimationFrame(() => top.current?.scrollIntoView({ block: 'start' }))
  }
  return (
    <div className="dc-set" ref={top}>
      <p className="mc-preamble">{CHROME.top}</p>
      <Item key={item.n} pack={pack} item={item} n={i + 1} total={items.length} accent={accent}
            st={st} set={set} order={orders[item.n] || []} />
      {Coach ? <Coach at={i} /> : null}
      <nav className="dc-nav">
        <button type="button" className="btn-ghost" disabled={i === 0} onClick={() => go(-1)}>&larr; Previous question</button>
        <button type="button" className="btn-ghost" disabled={i === items.length - 1} onClick={() => go(1)}>Next question &rarr;</button>
      </nav>
      {pack.credit && <p className="dc-credit">{pack.credit}</p>}
    </div>
  )
}

export const DOCCHECK_STYLES = `
.dc-stephead{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.12em;
  color:var(--gold);font-size:16px;margin:0 0 8px}
.dc-grid{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(0,1fr);gap:18px;align-items:start;margin-bottom:16px}
@media (max-width:860px){.dc-grid{grid-template-columns:minmax(0,1fr)}}
.dc-docs .stimulus{margin-bottom:16px}
.dc-text{color:#2c2110;font-size:16.5px;line-height:1.75;white-space:pre-wrap;margin:0}
.dc-imgwrap{position:relative;margin-bottom:12px}
.dc-imgwrap img{width:100%;border-radius:6px;display:block;margin:0}
.dc-mark{background:#F7D774;color:#1d1608;font-weight:700;text-decoration:underline;text-decoration-thickness:2px;
  text-underline-offset:3px;padding:1px 3px;border-radius:3px;box-shadow:0 0 0 2px #1d1608}
.dc-mark-tag{display:inline-block;margin-left:6px;font-family:'Barlow Condensed',sans-serif;font-size:12px;
  letter-spacing:.1em;text-transform:uppercase;background:#1d1608;color:#F7D774;padding:1px 6px;border-radius:4px;
  vertical-align:2px;font-style:normal;font-weight:700}
.dc-box{position:absolute;border:3px solid #F7D774;box-shadow:0 0 0 3px #1d1608, inset 0 0 0 2px #1d1608;border-radius:6px}
.dc-box-tag{position:absolute;left:-3px;top:-3px;transform:translateY(-100%);background:#1d1608;color:#F7D774;
  font-family:'Barlow Condensed',sans-serif;font-size:12px;letter-spacing:.1em;text-transform:uppercase;
  padding:1px 7px;border-radius:4px 4px 0 0;font-weight:700}
.dc-check{background:var(--card);border:1px solid var(--arena-choice-edge);border-radius:12px;padding:16px 16px 14px;
  box-shadow:0 6px 18px rgba(0,0,0,.28)}
.dc-check-title{font-family:'Barlow Condensed',sans-serif;font-size:22px;letter-spacing:.08em;color:var(--gold);margin-bottom:8px}
.dc-steps{margin:0;padding-left:22px;display:flex;flex-direction:column;gap:10px}
.dc-step{color:var(--white);font-size:15.5px;line-height:1.5}
.dc-step::marker{color:var(--gold);font-family:'Barlow Condensed',sans-serif;font-weight:700}
.dc-step b{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.06em;color:var(--white);font-size:17px}
.dc-step span{color:var(--white)}
.dc-step.now{border-left:3px solid var(--gold);padding-left:10px;margin-left:-13px}
.dc-walk-line{margin:6px 0 0;color:var(--white);background:var(--card-lit);border-radius:8px;padding:8px 10px;
  font-size:15.5px;line-height:1.5;border:1px solid var(--edge)}
.dc-next-step{margin-top:12px}
.dc-tuck summary{cursor:pointer;font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.1em;
  color:var(--gold);font-size:17px;list-style:none;padding:4px 0}
.dc-tuck summary::before{content:'+ ';}
.dc-tuck[open] summary::before{content:'– ';}
.dc-tuck[open] summary{margin-bottom:8px}
.dc-verdict{margin-top:14px;font-weight:600;color:var(--white)}
.dc-proof{margin-top:22px;padding-top:16px;border-top:1px solid var(--edge)}
.dc-ask{color:var(--white);font-size:18px;line-height:1.5;margin:0 0 12px}
.dc-opt span{color:var(--white)}
.dc-wide{grid-template-columns:minmax(0,1fr)}
.dc-imglink{display:block;cursor:zoom-in}
.mc-reveal .dc-feedback{color:var(--white);font-size:16.5px;line-height:1.6;margin-top:8px}
.dc-nav{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:6px 0 20px}
.dc-nav .btn-ghost:disabled{opacity:.4;cursor:default}
.dc-credit{color:var(--grey);font-size:14px;line-height:1.55;border-top:1px solid var(--edge);padding-top:12px;margin-top:8px}
.practice-row .row-blurb{display:block;color:var(--grey);font-size:15px;line-height:1.4;margin-top:3px;font-weight:400}
@media (prefers-reduced-motion:no-preference){
  .dc-mark,.dc-box{animation:dc-in .28s var(--ease-calm,ease-out) both}
  @keyframes dc-in{from{opacity:0;transform:scale(.98)}to{opacity:1;transform:none}}
}
`
