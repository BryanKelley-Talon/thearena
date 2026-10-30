// ============================================================
// SKILLS LAB — the mechanics under every part of the exam: how to do the things we do in
// class and get graded on. One room, both courses (Leo's order 2026-10-30 10:32, on BK's
// ruling that morning: "a place to point kids actively working in class"). Its own lane on
// the door, apart from the exam-part Labs (BK 2026-10-30 11:3x).
//
// AUTHORS NOTHING. Every teaching word comes from a signed source, cited at the line:
//   · READ THE DOC — the Doc Walk, read live from the course's own newest Doc Assist pack
//     (US: Q4 Civic Connection; Global: Q4 Enduring Issue). Nothing retyped here, so the room
//     can never drift from the walk kids already use. The Q4 step opens the course's own
//     Civic Principles / Six Umbrellas card (refcards.jsx).
//   · CALL YOUR WITNESS — the ruling of 2026-10-15 (BK 10:29, both courses) and the starter
//     BK said "yes." to at 13:34 (`thirty_second.WITNESS_STARTER`); "a source with no author is
//     still a witness" (ruled 10/15, Will's standing sheet). The weak/strong pair is the one
//     in that ruling; Danny checks it before a kid sees it.
//   · MAKE THE CASE — the 30-Second Case's four parts as printed from 11.3A / 10.3 on
//     (`thirty_second.THIRTY4_BEFORE`), and Make the Case's Explanation stem (N8, both courses).
//
// Words that are NOT ruled stay behind ?preview=skills-drafts (the Find the Proof drill, the
// lead-in frames 2 and 3). They are a proof for BK, never a kid's screen.
//
// Same laws as every Arena room: nothing reads as a score, nothing typed is kept. What a kid
// writes here lives in this component's memory and is gone when they leave.
// ============================================================
import { useEffect, useMemo, useState } from 'react'
import { RefButtons } from './refcards.jsx'

const PREVIEW_DRAFTS = (() => { try { return new URLSearchParams(window.location.search).get('preview') === 'skills-drafts' } catch { return false } })()

// ── course words: where the two courses genuinely differ, said inline, never a second room ──
const isUS = course => /us11r|^us$/.test(String(course?.id || course || ''))
// The Blueprint's heading wherever it sits (11.2's and 10.2's rooms; Casefile C from 11.3A / 10.3 on). BK 13:37 yes.
export const partThreeLabel = course => (isUS(course) ? 'Part III · CLE' : 'Part III · EIE')

// ── chrome: proof 1's lines, BK 2026-10-30 13:37 "yes to all" ──
export const SKILLSLAB_WORDS = {
  lane: 'Skills Lab',
  intro: 'How we do the things you’re graded on.',                       // BK 2026-10-30 11:4x "yes"
  back: 'Skills Lab',
  open: 'Open',
  noSave: 'Nothing here is scored or saved.',                            // the doc_check line, BK 10/01
  modules: {
    'read-the-doc': {
      title: 'Read the Doc',
      line: 'Start at the source. Then the claim, the side, and why it matters now.',   // BK 11:4x "yes"
    },
    'call-your-witness': {
      title: 'Call Your Witness',
      line: 'Don’t just drop the evidence — call your witness first. Who said it, when, and why.', // BK 11:3x
    },
    'make-the-case': {
      title: 'Make the Case',
      line: 'Build your case one piece at a time: context, claim, evidence, why it matters.',   // BK 11:3x
    },
  },
  // READ THE DOC
  startHere: 'START HERE',
  walkFrom: 'This is the Doc Walk from Doc Assist. Same steps, every document.',
  tryDoc: 'Try it on a real document',
  tryDocBtn: 'Open Doc Assist for the unit we’re in',
  // CALL YOUR WITNESS
  rule: 'Call your witness: before the evidence, say who made it and when. For top marks, add why they made it or who it was for.',
  pickQ: 'Which sentence calls its witness?',
  pickA: 'Sentence A', pickB: 'Sentence B',
  strong: 'CALLS THE WITNESS', weak: 'NO WITNESS',
  whyStrong: 'Who, when, to whom and why all come before the evidence.',
  whyWeak: '“Doc 2 says” tells the reader nothing about who is talking.',
  yes: 'Yes. That one calls its witness.',
  notYet: 'Not that one. Look again: who is talking in each?',
  starterHead: 'THE STARTER',
  noAuthorHead: 'NO AUTHOR? STILL A WITNESS.',
  noAuthor: 'Call it by what it is and when.',
  noAuthorEx: 'A map from 1836 shows…',
  // MAKE THE CASE
  caseQ: 'The question you’re answering',
  caseQHint: 'Copy today’s question from your casefile.',
  build: n => `Piece ${n} of 4`,
  addNext: 'Add the next piece',
  backPiece: 'Back a piece',
  yourCase: 'YOUR CASE',
  yourCaseEmpty: 'Your sentences show up here, in order, as you write them.',
  upgradeHead: 'FOR MAKE THE CASE AND THE ESSAY',
  upgrade: 'Stretch the last sentence:',
  startOver: 'Start over',
  doneLine: 'That’s a 30-Second Case. Four sentences, four skill lines.',
}
const W = SKILLSLAB_WORDS
const ORDER = ['read-the-doc', 'call-your-witness', 'make-the-case']

// ── signed content (sources above) ──
const WITNESS_STARTER = 'In [year], [who] [wrote / said / showed] that ___ (Doc __).'
const PAIR = {
  weak: 'Doc 2 says factions are dangerous.',
  strong: 'Writing in 1787 to persuade New Yorkers to ratify the Constitution, James Madison argued in Federalist No. 10 that a large republic would keep any one faction from taking control.',
}
// THIRTY4_BEFORE, in build order (the claim first: one sentence), shown in printed order.
const PARTS = [
  { key: 'HC', n: 1, name: 'Historical Context', job: 'Set the scene. What led up to it, then what was going on.', starter: 'After ___, ___. By [year], ___.' },
  { key: 'TH', n: 2, name: 'Thesis', job: 'Make the claim.', starter: 'Answer the question, then say why: ___ because ___.' },
  { key: 'DU', n: 3, name: 'Document Use', job: 'Back it up.', starter: WITNESS_STARTER },
  { key: 'EX', n: 4, name: 'Explanation', job: 'Connect it.', starter: 'This shows ___.' },
]
const BUILD = ['TH', 'DU', 'EX', 'HC']           // one sentence, then up to the full case
const MTC_STEM = 'This shows ___, which matters because ___.'

// NOT RULED (Leo 10/15 §3, Will's sheet "Not ruled yet"): preview only.
const DRAFT = {
  frames: [
    { n: 2, line: 'Writing to [audience] in order to [purpose], [who] argued that…' },
    { n: 3, line: 'A lead-in, plus a short quote woven into your own sentence.' },
  ],
  findProof: {
    head: 'FIND THE PROOF · DRAFT, NOT RULED',
    claim: 'A large republic protects people from any one group taking over.',
    doc: '“Extend the sphere, and you take in a greater variety of parties and interests; you make it less probable that a majority of the whole will have a common motive to invade the rights of other citizens.”',
    source: 'James Madison, Federalist No. 10, 1787',
    ask: 'The claim is given. Write one sentence that calls the witness and gives the proof.',
    checks: ['I named who wrote it and when, before the evidence', 'My evidence is from the document', 'It proves the claim, not just the topic'],
    model: PAIR.strong,
  },
}

// The newest published Doc Assist pack that carries a Doc Walk (10.3's pack carries none yet).
export function useDocWalk(course) {
  const [pack, setPack] = useState(null)
  useEffect(() => {
    if (!course) return
    let live = true
    const refs = (course.units || []).map(u => u.doc_assist).filter(d => d?.published && d.content_ref).map(d => d.content_ref).reverse()
    ;(async () => {
      for (const r of refs) {
        const p = await fetch(`/content/${String(r).replace(/^content\//, '')}`).then(x => (x.ok ? x.json() : null)).catch(() => null)
        if (p && Array.isArray(p.walk) && p.walk.length) { if (live) setPack(p); return }
      }
      if (live) setPack(false)
    })()
    return () => { live = false }
  }, [course?.id])
  return pack
}

// ── the lane: three cards, or one module ──
export function SkillsLabLane({ course, module, onPick, refs, onOpenDocAssist, canDocAssist }) {
  const open = ORDER.includes(module) ? module : null
  if (!open) return (
    <>
      <div className="grid room-cards sl-cards">
        {ORDER.map(k => (
          <button key={k} type="button" className="card" onClick={() => { onPick(k); window.scrollTo(0, 0) }}>
            <div className="card-type">{W.lane}</div>
            <div className="card-name">{W.modules[k].title}</div>
            <div className="card-blurb">{W.modules[k].line}</div>
            <span className="flag live">{W.open}</span>
          </button>
        ))}
      </div>
      {PREVIEW_DRAFTS && <FindTheProofDraft />}
    </>
  )
  const back = <button type="button" className="sl-back link-btn" onClick={() => { onPick(null); window.scrollTo(0, 0) }}>&larr; {W.back}</button>
  return (
    <section className="sl-module" aria-labelledby="sl-h">
      {back}
      <h2 className="sl-title" id="sl-h">{W.modules[open].title}</h2>
      <p className="sl-line">{W.modules[open].line}</p>
      {open === 'read-the-doc' && <ReadTheDoc course={course} refs={refs} onOpenDocAssist={onOpenDocAssist} canDocAssist={canDocAssist} />}
      {open === 'call-your-witness' && <CallYourWitness />}
      {open === 'make-the-case' && <MakeTheCase />}
      <div className="sl-bottom">{back}</div>
    </section>
  )
}

// ── READ THE DOC: the Doc Walk, as signed, source first ──
function ReadTheDoc({ course, refs, onOpenDocAssist, canDocAssist }) {
  const pack = useDocWalk(course)
  const [howTo, setHowTo] = useState(false)
  if (pack === null) return <p className="sl-note">…</p>
  if (pack === false) return <p className="sl-note">Not open yet.</p>
  const ann = pack.annotate?.methods
  return (
    <>
      <p className="sl-note">{W.walkFrom}</p>
      <ol className="sl-walk">
        {pack.walk.map((s, i) => (
          <li key={i} className={`sl-step${i === 0 ? ' first' : ''}`}>
            {i === 0 && <span className="sl-start">{W.startHere}</span>}
            <div className="sl-tag">{s.tag}</div>
            <div className="sl-step-name">{s.step}</div>
            <p className="sl-say">{s.say}</p>
            {s.say_image && <p className="sl-say sl-say-img">{s.say_image}</p>}
            <RefButtons text={s.say} refs={refs} idBase={`sl-ref-${i}`} />
          </li>
        ))}
      </ol>
      {ann && (
        <div className="sl-box">
          <button type="button" className="da-btn" aria-expanded={howTo} onClick={() => setHowTo(o => !o)}>
            <span aria-hidden="true" className="da-ico">{howTo ? '−' : '+'}</span>{pack.annotate.button || pack.labels?.annotate}
          </button>
          {howTo && (
            <div className="sl-ann">
              {Object.entries(ann).map(([kind, rows]) => (
                <div key={kind} className="sl-ann-col">
                  <div className="sl-ann-kind">{kind === 'text' ? 'Text' : kind === 'picture' ? 'Picture' : kind === 'map' ? 'Map' : kind}</div>
                  <dl>{rows.map(([h, d]) => <div key={h}><dt>{h}</dt><dd>{d}</dd></div>)}</dl>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {canDocAssist && (
        <div className="sl-box">
          <div className="sl-head">{W.tryDoc}</div>
          <button type="button" className="practice-row sl-go" onClick={onOpenDocAssist}><span>{W.tryDocBtn}</span><span className="flag live">{W.open}</span></button>
        </div>
      )}
    </>
  )
}

// ── CALL YOUR WITNESS: the rule, a pick between the pair, the starter, the no-author case ──
function CallYourWitness() {
  // Which letter the strong sentence wears is fixed per visit, so the answer isn't always "B".
  const strongIsA = useMemo(() => Math.random() < 0.5, [])
  const [pick, setPick] = useState(null)     // 'A' | 'B'
  const A = strongIsA ? PAIR.strong : PAIR.weak
  const B = strongIsA ? PAIR.weak : PAIR.strong
  const right = pick && ((pick === 'A') === strongIsA)
  const tagFor = isStrong => (isStrong ? W.strong : W.weak)
  return (
    <>
      <p className="sl-rule">{W.rule}</p>
      <div className="sl-box">
        <div className="sl-head">{W.pickQ}</div>
        {[['A', A, strongIsA], ['B', B, !strongIsA]].map(([L, text, isStrong]) => (
          <button key={L} type="button" className={`sl-choice${pick ? (isStrong ? ' is-strong' : ' is-weak') : ''}${pick === L ? ' picked' : ''}`}
                  aria-pressed={pick === L} onClick={() => setPick(L)}>
            <span className="sl-choice-l">{L === 'A' ? W.pickA : W.pickB}{pick && <span className="sl-verdict"> · {tagFor(isStrong)}</span>}</span>
            <span className="sl-choice-t">{text}</span>
            {pick && <span className="sl-why">{isStrong ? W.whyStrong : W.whyWeak}</span>}
          </button>
        ))}
        {pick && <p className="sl-fb" role="status">{right ? W.yes : W.notYet}</p>}
      </div>
      <div className="sl-box">
        <div className="sl-head">{W.starterHead}</div>
        <p className="sl-starter">{WITNESS_STARTER}</p>
        {PREVIEW_DRAFTS && (
          <div className="sl-draft">
            <div className="sl-draft-tag">DRAFT, NOT RULED · lead-in frames 2 and 3</div>
            {DRAFT.frames.map(f => <p key={f.n} className="sl-starter">{f.n} · {f.line}</p>)}
          </div>
        )}
      </div>
      <div className="sl-box">
        <div className="sl-head">{W.noAuthorHead}</div>
        <p className="sl-say">{W.noAuthor} <em>{W.noAuthorEx}</em></p>
      </div>
    </>
  )
}

// ── MAKE THE CASE: one sentence, then up to the full case ──
function MakeTheCase() {
  const [q, setQ] = useState('')
  const [text, setText] = useState({ HC: '', TH: '', DU: '', EX: '' })
  const [step, setStep] = useState(0)                     // index into BUILD
  const shown = BUILD.slice(0, step + 1)
  const cur = PARTS.find(p => p.key === BUILD[step])
  const assembled = PARTS.filter(p => shown.includes(p.key) && text[p.key].trim())
  const done = step === BUILD.length - 1
  return (
    <>
      <p className="sl-note">{W.noSave}</p>
      <label className="sl-field">
        <span className="sl-head">{W.caseQ}</span>
        <input type="text" value={q} onChange={e => setQ(e.target.value)} placeholder={W.caseQHint} />
      </label>

      <div className="sl-box">
        <div className="sl-head">{W.build(step + 1)}</div>
        <div className="sl-part-name">{cur.n} · {cur.name}</div>
        <p className="sl-say">{cur.job}</p>
        <p className="sl-starter">{cur.starter}</p>
        <textarea rows={3} value={text[cur.key]} aria-label={`${cur.n} · ${cur.name}`} placeholder={cur.starter}
                  onChange={e => setText(t => ({ ...t, [cur.key]: e.target.value }))} />
        <div className="sl-row">
          {step > 0 && <button type="button" className="da-btn" onClick={() => setStep(s => s - 1)}>{W.backPiece}</button>}
          {!done && <button type="button" className="da-btn sl-next" onClick={() => setStep(s => s + 1)}>{W.addNext}</button>}
        </div>
      </div>

      <div className="sl-box sl-case" aria-live="polite">
        <div className="sl-head">{W.yourCase}</div>
        {q.trim() && <p className="sl-case-q">{q}</p>}
        {!assembled.length
          ? <p className="sl-note">{W.yourCaseEmpty}</p>
          : <p className="sl-case-p">{assembled.map(p => (
              <span key={p.key} className="sl-case-s"><span className="sl-case-n" aria-label={p.name}>{p.n}</span> {text[p.key].trim()} </span>
            ))}</p>}
        <ol className="sl-map">
          {PARTS.map(p => <li key={p.key} className={shown.includes(p.key) ? 'on' : ''}><b>{p.n}</b> {p.name}</li>)}
        </ol>
        {done && <p className="sl-fb">{W.doneLine}</p>}
      </div>

      {done && (
        <div className="sl-box">
          <div className="sl-head">{W.upgradeHead}</div>
          <p className="sl-say">{W.upgrade}</p>
          <p className="sl-starter">{MTC_STEM}</p>
        </div>
      )}
      {(step > 0 || Object.values(text).some(Boolean) || q) && (
        <button type="button" className="link-btn sl-over" onClick={() => { setQ(''); setText({ HC: '', TH: '', DU: '', EX: '' }); setStep(0) }}>{W.startOver}</button>
      )}
    </>
  )
}

// ── preview only: the Find the Proof drill, for BK to rule on ──
function FindTheProofDraft() {
  const d = DRAFT.findProof
  const [txt, setTxt] = useState('')
  const [checked, setChecked] = useState([])
  const [show, setShow] = useState(false)
  return (
    <section className="sl-module sl-draft" aria-label={d.head}>
      <div className="sl-draft-tag">{d.head}</div>
      <div className="sl-box">
        <div className="sl-head">CLAIM</div>
        <p className="sl-say"><b>{d.claim}</b></p>
      </div>
      <figure className="sl-doc">
        <blockquote>{d.doc}</blockquote>
        <figcaption>{d.source}</figcaption>
      </figure>
      <p className="sl-say">{d.ask}</p>
      <p className="sl-starter">{WITNESS_STARTER}</p>
      <textarea rows={3} value={txt} onChange={e => setTxt(e.target.value)} aria-label="Your sentence" placeholder={WITNESS_STARTER} />
      <ul className="sl-checks">
        {d.checks.map((c, i) => (
          <li key={i}><label><input type="checkbox" checked={checked.includes(i)} onChange={() => setChecked(x => (x.includes(i) ? x.filter(y => y !== i) : [...x, i]))} /> {c}</label></li>
        ))}
      </ul>
      <button type="button" className="da-btn" aria-expanded={show} onClick={() => setShow(s => !s)}>{show ? 'Hide the model' : 'Show a model'}</button>
      {show && <p className="sl-starter">{d.model}</p>}
    </section>
  )
}

export const SKILLSLAB_STYLES = `
.sl-cards{margin-bottom:28px}
/* Everything a kid reads sits on a card or a smoked plate, never loose on the gym photo. */
.sl-module{max-width:760px;padding:18px 18px 20px;border-radius:14px;border:1px solid var(--edge);
  background:color-mix(in srgb,var(--canvas) 90%,transparent);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.sl-back{margin-bottom:14px}
.sl-bottom{margin-top:30px;padding-top:16px;border-top:1px solid var(--edge)}
.sl-title{font-family:'Barlow Condensed',sans-serif;font-size:34px;line-height:1.1;color:var(--white);margin:0 0 6px}
.sl-line{color:var(--gold-lit);font-size:18px;line-height:1.5;margin:0 0 18px}
.sl-note{color:var(--grey);font-size:15.5px;line-height:1.55;margin:0 0 14px}
.sl-head{font-family:'Barlow Condensed',sans-serif;letter-spacing:.06em;font-size:15px;color:var(--gold-lit);text-transform:uppercase;margin-bottom:8px;display:block}
.sl-box{background:var(--card);border:1px solid var(--edge);border-radius:12px;padding:16px 16px 18px;margin:0 0 16px;box-shadow:0 2px 10px rgba(0,0,0,.25)}
.sl-say{color:var(--white);font-size:16.5px;line-height:1.55;margin:0 0 8px}
.sl-say-img{color:var(--grey)}
.sl-rule{color:var(--white);font-size:18px;line-height:1.55;margin:0 0 18px;padding:12px 14px;border-left:4px solid var(--gold);background:var(--card)}
.sl-starter{font-family:'Outfit',sans-serif;color:var(--white);font-size:16.5px;line-height:1.5;margin:6px 0 10px;padding:10px 12px;border:1px dashed var(--gold);border-radius:8px;background:rgba(227,179,65,.06)}
.sl-walk{list-style:none;padding:0;margin:0 0 16px;display:grid;gap:12px}
.sl-step{position:relative;background:var(--card);border:1px solid var(--edge);border-radius:12px;padding:14px 16px}
.sl-step.first{border:2px solid var(--gold)}
.sl-start{display:inline-block;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:.08em;font-size:13px;color:var(--canvas);background:var(--gold);border-radius:4px;padding:2px 8px;margin-bottom:8px}
.sl-tag{font-family:'Barlow Condensed',sans-serif;letter-spacing:.07em;font-size:14px;color:var(--gold-lit)}
.sl-step-name{font-family:'Barlow Condensed',sans-serif;font-size:23px;color:var(--white);margin:2px 0 4px}
.sl-ann{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin-top:12px}
.sl-ann-kind{font-family:'Barlow Condensed',sans-serif;font-size:18px;color:var(--gold-lit);margin-bottom:6px}
.sl-ann dt{color:var(--white);font-weight:700;font-size:14px;letter-spacing:.04em;margin-top:8px}
.sl-ann dd{color:var(--grey);margin:2px 0 0;font-size:15px;line-height:1.5}
.sl-go{margin-top:4px}
.sl-choice{display:block;width:100%;text-align:left;margin:0 0 10px;padding:12px 14px;border-radius:10px;background:#24365A;border:2px solid #4A6085;color:var(--white);font:inherit;cursor:pointer;min-height:44px}
.sl-choice:hover{border-color:var(--gold)}
.sl-choice.picked{box-shadow:inset 0 0 0 2px var(--gold-lit)}
.sl-choice.is-strong{border-color:var(--gold)}
.sl-choice.is-weak{border-style:dashed}
.sl-choice-l{display:block;font-family:'Barlow Condensed',sans-serif;letter-spacing:.05em;font-size:15px;color:var(--gold-lit);margin-bottom:4px}
.sl-verdict{color:var(--white);font-weight:700}
.sl-choice-t{display:block;font-size:16.5px;line-height:1.5}
.sl-why{display:block;margin-top:8px;color:var(--grey);font-size:15px;line-height:1.5}
.sl-fb{color:var(--white);font-weight:600;margin:8px 0 0;font-size:16px}
.sl-field{display:block;margin:0 0 16px}
.sl-field input,.sl-module textarea{width:100%;box-sizing:border-box;font:inherit;font-size:16px;color:var(--white);background:#0F1A2E;border:2px solid #4A6085;border-radius:8px;padding:10px 12px}
.sl-field input:focus,.sl-module textarea:focus{outline:3px solid var(--gold-lit);outline-offset:1px;border-color:var(--gold)}
.sl-part-name{font-family:'Barlow Condensed',sans-serif;font-size:24px;color:var(--white);margin-bottom:2px}
.sl-row{display:flex;gap:10px;flex-wrap:wrap;margin-top:10px}
.sl-case-q{color:var(--gold-lit);font-style:italic;margin:0 0 8px}
.sl-case-p{color:var(--white);font-size:17px;line-height:1.7;margin:0 0 12px}
.sl-case-n{display:inline-block;min-width:20px;text-align:center;font-family:'Barlow Condensed',sans-serif;font-size:13px;color:var(--canvas);background:var(--gold);border-radius:4px;margin-right:2px;vertical-align:2px}
.sl-map{list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:8px}
.sl-map li{font-size:14px;color:var(--dim);border:1px solid var(--edge);border-radius:6px;padding:3px 8px}
.sl-map li.on{color:var(--white);border-color:var(--gold)}
.sl-map b{color:var(--gold-lit);margin-right:3px}
.sl-over{margin-top:4px}
.sl-draft{margin-top:24px;padding:14px;border:2px dashed #B58A2E;border-radius:12px}
.sl-draft-tag{font-family:'Barlow Condensed',sans-serif;letter-spacing:.08em;font-size:14px;color:#F2C46B;margin-bottom:10px}
.sl-doc{margin:0 0 12px;padding:12px 14px;background:#F3EBD8;color:#1C1710;border-radius:8px}
.sl-doc blockquote{margin:0 0 6px;font-size:16.5px;line-height:1.55}
.sl-doc figcaption{font-size:14px;color:#4A3F2C}
.sl-checks{list-style:none;padding:0;margin:10px 0}
.sl-checks li{margin:6px 0;color:var(--white)}
.sl-checks input{width:20px;height:20px;vertical-align:-4px;margin-right:6px}
@media (max-width:560px){.sl-title{font-size:29px}.sl-step-name{font-size:21px}}
`
