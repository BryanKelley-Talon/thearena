// ============================================================
// THE ARENA CHASE (BK 2026-10-06 22:15 "yes." to Sam's concept; 22:12: an invented villain, no
// clock, one engine for both courses). A suspect is on the run through the unit. Each clue can only
// be answered with an Arena tool (the Atlas for where, the Threads map for when, Doc Assist for the
// evidence); each stop has one Regents-style question on that stop's document; each right answer
// puts an evidence line on the warrant. The last door is the teacher's key.
//
// The chase lives inside the Arena, so a clue's tool opens in this same tab, and a "Back to the
// chase" bar follows the student round the Arena until they come back. Its place is kept in
// sessionStorage for this tab only (a convenience; nothing about a student, nothing sent).
//
// No clock (BK 22:12): the tension is the trail going cold, shown as fading footprints with the
// pack's words, never seconds, never game over; plus one near miss. Every student word is the
// pack's (Sam for US, Will for Global); the engine's own labels are CHASE_WORDS, working labels
// until BK approves them. The case-file look (BK 21:01 "that vibe is approved") is scoped to .chase.
// ============================================================
import { useEffect, useMemo, useState } from 'react'
import '@fontsource/courier-prime/latin-400.css'
import '@fontsource/courier-prime/latin-700.css'

// BK 2026-10-07 11:49 "yes approved." to the engine proof: NINE STATES' shape, and the labels onward ('Keep going'),
// meterCount ('9 states') and warrantTip ('...finish the lines below...'). The other labels are still working labels.
export const CHASE_WORDS = {
  _approved: false,
  title: 'The chase',
  start: 'Start the chase',
  resume: 'Back to the chase',
  stop: n => `Stop ${n}`,
  clue: 'The clue',
  open: { atlas: 'Open the Atlas', threads: 'Open the Threads map', 'doc-assist': 'Open Doc Assist', issues: 'Open the Enduring Issues map' },
  tryIt: 'Try it',
  hint: n => `Show hint ${n}`,
  notYet: 'Not yet. The trail cools. Look again.',
  right: 'That\'s them.',
  why: 'Why',
  evidence: 'Evidence for the warrant',
  next: 'Next stop',
  toWarrant: 'Write the warrant',
  warrant: 'The warrant',
  warrantTip: 'Copy these onto your warrant, then finish the lines below and bring it to your teacher.',
  key: 'Key',
  keyWrong: 'That\'s not the key. Finish the warrant and bring it up.',
  enter: 'Enter',
  caught: 'CAUGHT',
  again: 'Start over',
  trail: 'The trail',
  doc: (n, cf) => cf ? `Casefile ${cf} · Document ${n}` : `Document ${n}`,
  typeLabel: 'Your answer',
  onward: 'Keep going',
  meterCount: (n, m) => `${n} ${n === 1 ? (m.one || 'state') : (m.many || 'states')}`,
}
const W = CHASE_WORDS

const KEY = 'arena-chase:v1'
export function readChase() { try { return JSON.parse(sessionStorage.getItem(KEY) || 'null') } catch { return null } }
const writeChase = s => { try { s ? sessionStorage.setItem(KEY, JSON.stringify(s)) : sessionStorage.removeItem(KEY) } catch { /* convenience only */ } }

// The link a clue's tool opens, in the Arena's own scheme (deeplinks.js).
export function toolHash(courseKey, unitNumber, tool, link) {
  if (tool === 'atlas') return `#/${courseKey}/atlas/${encodeURIComponent(link)}`
  if (tool === 'threads') return link ? `#/${courseKey}/threads/${encodeURIComponent(link)}` : `#/${courseKey}/threads`
  if (tool === 'issues') return link ? `#/${courseKey}/issues/${encodeURIComponent(link)}` : `#/${courseKey}/issues`
  if (tool === 'doc-assist') return `#/${courseKey}/${unitNumber}/doc-assist${link ? `/${link}` : ''}`
  return `#/${courseKey}`
}
export const chaseHash = (courseKey, unitNumber) => `#/${courseKey}/chase/${unitNumber}`

// A key typed at the last door: plain in dev, hashed in the student build (scripts/seal-chase.mjs).
async function keyFits(pack, typed) {
  const w = String(typed || '').trim().toLowerCase()
  if (!w) return false
  const f = pack.final || {}
  if (Array.isArray(f.key_words)) return f.key_words.some(k => k.toLowerCase() === w)
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${pack.id}|${w}`))
    const hex = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
    return (f.key_hashes || []).includes(hex)
  } catch { return false }
}

// "Back to the chase": shown on every Arena page while a chase is running in this tab.
export function ChaseBar({ hidden }) {
  const [c, setC] = useState(readChase)
  useEffect(() => { const on = () => setC(readChase()); window.addEventListener('hashchange', on); return () => window.removeEventListener('hashchange', on) }, [])
  if (hidden || !c || !c.hash || c.step === 'caught') return null
  return (
    <a className="chase-bar" href={c.hash}>
      <span className="chase-bar-dot" aria-hidden="true" />
      <b>{W.resume}</b><span>{c.where || ''}</span>
    </a>
  )
}

// The trail: footprints that fade as it cools, with the pack's words. pack.cold runs warmest first.
// A stop may set the trail on arrival (stop.trail, one of pack.cold's words), so a story can run
// cold in the middle and warm back up (Will's 10.2 trail); a miss cools it a step, a right answer
// warms it a step. Words and footprints together, never colour alone, never seconds.
function Footprints({ pack, cold }) {
  const words = pack.cold || []
  const steps = words.length || 4
  return (
    <div className="chase-trail" aria-label={`${W.trail}: ${words[cold] || ''}`}>
      <span className="chase-pin">{W.trail}</span>
      <span className="chase-prints" aria-hidden="true">
        {Array.from({ length: steps }, (_, i) => <i key={i} className={i >= steps - cold ? 'faded' : ''} />)}
      </span>
      <em>{words[cold] || ''}</em>
    </div>
  )
}

// The meter (NINE STATES: "States that have ratified", 0 of 9; BK 2026-10-06 22:41). One pip per
// unit of the goal; a stop's question adds first_try on a clean first answer, after_hint otherwise.
// Pips and a count of the pack's own unit, never "X of Y" in words.
function Meter({ meter, n }) {
  if (!meter) return null
  const goal = meter.goal || 0, have = Math.min(goal, n)
  return (
    <div className="chase-meter" role="img" aria-label={`${meter.label}: ${W.meterCount(have, meter)}`}>
      <span className="chase-pin">{meter.label}</span>
      <span className="chase-pips" aria-hidden="true">
        {Array.from({ length: goal }, (_, i) => <i key={i} className={i < have ? 'on' : ''}>{i < have ? '★' : ''}</i>)}
      </span>
      <em>{W.meterCount(have, meter)}</em>
    </div>
  )
}

function Doc({ doc, cf }) {
  if (!doc) return null
  const img = doc.image_file || (doc.images && doc.images[0] && doc.images[0].file)
  return (
    <figure className="chase-doc">
      <figcaption>{W.doc(doc.n, cf)} · {doc.title}</figcaption>
      {doc.kind === 'image' && img
        ? <img src={`/content/${String(img).split('/').pop()}`} alt={doc.image_alt || doc.describe || ''} />
        : <div className="chase-doctext">{(doc.text || []).map((p, i) => <p key={i}>{p}</p>)}</div>}
      <p className="chase-src">{doc.src}</p>
    </figure>
  )
}

// A pack picture (the suspect's likeness, the end photo): a path inside the site, never off-site.
const pic = p => `/${String(p || '').replace(/^\/+/, '')}`

function Ask({ ask, onRight, onMiss }) {
  const [pick, setPick] = useState(null)
  const [typed, setTyped] = useState('')
  const [hints, setHints] = useState(0)
  const [miss, setMiss] = useState(false)
  const [missed, setMissed] = useState(false)
  const tryIt = () => {
    let ok = false
    if (ask.type === 'type') ok = (ask.accept || []).some(a => a.toLowerCase() === typed.trim().toLowerCase())
    else ok = pick === ask.answer
    if (ok) onRight({ clean: !missed && hints === 0 }); else { setMiss(true); setMissed(true); onMiss() }
  }
  return (
    <div className="chase-ask">
      <p className="chase-prompt">{ask.prompt || ask.stem}</p>
      {ask.type === 'type'
        ? <label className="chase-field">{W.typeLabel}<input value={typed} onChange={e => { setMiss(false); setTyped(e.target.value) }} autoComplete="off" spellCheck="false" /></label>
        : <div className="chase-opts" role="radiogroup">{(ask.options || []).map((o, i) => <button key={i} type="button" role="radio" aria-checked={pick === i} className={`chase-opt${pick === i ? ' on' : ''}`} onClick={() => { setMiss(false); setPick(i) }}>{o}</button>)}</div>}
      <div className="chase-row"><button type="button" className="chase-btn" disabled={ask.type === 'type' ? !typed.trim() : pick === null} onClick={tryIt}>{W.tryIt}</button></div>
      {miss && <p className="chase-miss" role="status">{W.notYet}</p>}
      <div className="chase-hints">
        {(ask.hints || []).slice(0, hints).map((h, i) => <p key={i} className="chase-hint">{h}</p>)}
        {hints < (ask.hints || []).length && <button type="button" className="chase-ghost" onClick={() => setHints(h => h + 1)}>{W.hint(hints + 1)}</button>}
      </div>
    </div>
  )
}

// The pack as one run of beats. A pack is either { stops, door? } (one act) or { acts: [{ title,
// intro, stops, door? }] }. An act after the first opens with its own screen (NINE STATES: the
// pardon, then the trail west). A door is a stop with two documents and no clue: its question is
// the last word on the act's meter, then the act's result (door.ratified, or door.short with {n}).
export function beatsOf(pack) {
  const acts = Array.isArray(pack.acts) && pack.acts.length ? pack.acts : [{ stops: pack.stops || [], door: pack.door || null }]
  const out = []
  let n = 0
  acts.forEach((a, ai) => {
    if (ai > 0 || a.title) out.push({ kind: 'act', act: a, ai })
    for (const st of a.stops || []) out.push({ kind: 'stop', stop: st, n: ++n, ai })
    if (a.door) out.push({ kind: 'door', door: a.door, ai })
  })
  return out
}

export function ChaseScreen({ course, courseKey, unit, pack, daPack, ScreenHeader, BottomBack, onBack }) {
  const beats = useMemo(() => beatsOf(pack), [pack])
  const coldOf = w => { const k = (pack.cold || []).indexOf(w); return k < 0 ? null : k }
  const arrive = (x, b) => {
    const bt = beats[b]
    if (!bt) return { ...x, b, step: 'warrant' }
    const step = bt.kind === 'act' ? 'act' : bt.kind === 'door' ? 'door' : 'clue'
    const set = bt.kind === 'stop' ? coldOf(bt.stop.trail) : null
    return { ...x, b, step, cold: set == null ? x.cold : set }
  }
  const fresh = () => arrive({ id: pack.id, b: 0, step: 'intro', cold: 0, ev: [], meter: 0 }, 0)
  const [s, setS] = useState(() => { const c = readChase(); return c && c.id === pack.id && c.v === 2 ? c : { ...fresh(), step: 'intro' } })
  const beat = beats[s.b]
  const stop = beat && beat.kind === 'stop' ? beat.stop : null
  const door = beat && beat.kind === 'door' ? beat.door : null
  const hash = chaseHash(courseKey, unit.number)
  const where = stop ? `${W.stop(beat.n)} · ${stop.place}` : door ? door.place : beat && beat.kind === 'act' ? (beat.act.title || '') : ''
  useEffect(() => { writeChase({ ...s, v: 2, hash, where }) }, [s])
  useEffect(() => { window.scrollTo(0, 0) }, [s.b, s.step])
  const docs = useMemo(() => {
    const out = {}
    for (const cf of (daPack?.casefiles || [])) for (const d of cf.docs || []) out[`${cf.id}/${d.n}`] = d
    return out
  }, [daPack])
  // The meter runs in an act that ends at a door (NINE STATES Act I); an act with no door (Act II) hides it.
  const doorAct = useMemo(() => new Set(beats.filter(b => b.kind === 'door').map(b => b.ai)), [beats])
  const coldMax = Math.max(0, (pack.cold || []).length - 1)
  const cool = () => setS(x => ({ ...x, cold: Math.min(coldMax, x.cold + 1) }))
  const warm = x => Math.max(0, x.cold - 1)
  const award = (x, clean) => (pack.meter && doorAct.has(beats[x.b]?.ai)) ? (x.meter || 0) + (clean ? pack.meter.first_try : pack.meter.after_hint) : (x.meter || 0)
  const next = () => setS(x => arrive(x, x.b + 1))
  const [key, setKey] = useState(''), [bad, setBad] = useState(false)
  const tab = stop ? `${W.stop(beat.n)} · ${stop.place} · ${stop.year}` : door ? `${door.place} · ${door.year}` : ''
  const goal = pack.meter?.goal || 0
  const meterOn = !!(pack.meter && beat && doorAct.has(beat.ai))
  const showMeter = meterOn && s.step !== 'intro' && s.step !== 'caught' && s.step !== 'warrant'

  return (
    <div className="chase">
      <ScreenHeader label={pack.title || W.title} onBack={onBack} back={course.label} color="#E3B341" />
      <div className="wrap chase-wrap">
        {pack.standing && <p className="chase-standing">{pack.standing}</p>}
        {s.step !== 'intro' && s.step !== 'caught' && s.step !== 'act' && s.step !== 'doorcard' && <Footprints pack={pack} cold={s.cold} />}
        {showMeter && <Meter meter={pack.meter} n={s.meter || 0} />}

        {s.step === 'intro' && <section className="chase-card">
          <div className="chase-tab">{W.title}</div>
          {pack.suspect && <div className="chase-suspect">
            {pack.suspect.portrait && <figure><img src={pic(pack.suspect.portrait)} alt={pack.suspect.portrait_alt || ''} />{pack.suspect.portrait_src && <figcaption className="chase-src">{pack.suspect.portrait_src}</figcaption>}</figure>}
            <div><h2>{pack.suspect.name}</h2>{pack.suspect.line && <p>{pack.suspect.line}</p>}</div>
          </div>}
          {(pack.intro || []).map((l, i) => <p key={i} className="chase-read">{l}</p>)}
          {pack.meter?.line && <p className="chase-meterline">{pack.meter.line}</p>}
          <div className="chase-row"><button type="button" className="chase-btn" onClick={() => setS(x => arrive({ ...x, step: 'clue' }, x.b))}>{W.start}</button></div>
        </section>}

        {beat && beat.kind === 'act' && s.step === 'act' && <section className="chase-card">
          {beat.act.title && <div className="chase-tab">{beat.act.title}</div>}
          {(beat.act.intro || []).map((l, i) => <p key={i} className="chase-read">{l}</p>)}
          <div className="chase-row"><button type="button" className="chase-btn" onClick={next}>{W.onward}</button></div>
        </section>}

        {stop && s.step === 'clue' && <section className="chase-card">
          <div className="chase-tab">{tab}</div>
          {stop.story && <p className="chase-story">{stop.story}</p>}
          <h2 className="chase-h">{W.clue}</h2>
          <p className="chase-read">{stop.clue.text}</p>
          <div className="chase-row"><a className="chase-tool" href={toolHash(courseKey, unit.number, stop.clue.tool, stop.clue.link)}>{W.open[stop.clue.tool] || stop.clue.tool} →</a></div>
          <Ask key={`a${s.b}`} ask={stop.clue.ask} onMiss={cool}
               onRight={() => setS(x => stop.question ? { ...x, step: 'question' } : { ...x, step: 'card', cold: warm(x) })} />
        </section>}

        {stop && stop.question && s.step === 'question' && <section className="chase-card">
          <div className="chase-tab">{tab}</div>
          <Doc doc={docs[`${stop.question.doc.casefile}/${stop.question.doc.n}`]} cf={stop.question.doc.casefile} />
          <Ask key={`q${s.b}`} ask={stop.question} onMiss={cool}
               onRight={({ clean }) => setS(x => ({ ...x, step: 'card', cold: warm(x), meter: award(x, clean), ev: stop.evidence ? [...x.ev.filter(e => e.b !== x.b), { b: x.b, text: stop.evidence }] : x.ev }))} />
        </section>}

        {stop && s.step === 'card' && <section className="chase-card">
          <div className="chase-tab">{tab}</div>
          <p className="chase-right" role="status">✓ {pack.fresh || W.right}</p>
          {stop.question?.why && <p className="chase-read"><b>{W.why}.</b> {stop.question.why}</p>}
          {stop.after && <p className="chase-read">{stop.after}</p>}
          {stop.evidence && stop.question && <div className="chase-evcard"><span>{W.evidence}</span>{stop.evidence}</div>}
          {stop.nearMiss && <p className="chase-near">{stop.nearMiss}</p>}
          <div className="chase-row"><button type="button" className="chase-btn" onClick={next}>{s.b + 1 >= beats.length ? W.toWarrant : W.next}</button></div>
        </section>}

        {door && s.step === 'door' && <section className="chase-card">
          <div className="chase-tab">{tab}</div>
          {door.text && <p className="chase-read">{door.text}</p>}
          {(door.docs || []).map((d, i) => <Doc key={i} doc={docs[`${d.casefile}/${d.n}`]} cf={d.casefile} />)}
          <Ask key={`d${s.b}`} ask={door.question} onMiss={cool}
               onRight={({ clean }) => setS(x => ({ ...x, step: 'doorcard', cold: warm(x), meter: award(x, clean), ev: door.evidence ? [...x.ev.filter(e => e.b !== x.b), { b: x.b, text: door.evidence }] : x.ev }))} />
        </section>}

        {door && s.step === 'doorcard' && <section className="chase-card">
          <div className="chase-tab">{tab}</div>
          <p className="chase-right" role="status">✓ {pack.fresh || W.right}</p>
          {door.question?.why && <p className="chase-read"><b>{W.why}.</b> {door.question.why}</p>}
          {!goal || (s.meter || 0) >= goal
            ? (door.ratified || []).map((l, i) => i === 0 && (door.ratified.length > 1) ? <div key={i} className="chase-stamp chase-stamp-door">{l}</div> : <p key={i} className="chase-read">{l}</p>)
            : door.short && <p className="chase-read">{String(door.short).replace('{n}', String(goal - (s.meter || 0)))}</p>}
          <div className="chase-row"><button type="button" className="chase-btn" onClick={next}>{s.b + 1 >= beats.length ? W.toWarrant : W.next}</button></div>
        </section>}

        {s.step === 'warrant' && <section className="chase-card">
          <div className="chase-tab">{pack.final?.title || W.warrant}</div>
          <p className="chase-read">{W.warrantTip}</p>
          <ol className="chase-evlist">{s.ev.map(e => <li key={e.b}>{e.text}</li>)}</ol>
          <ol className="chase-wlines">{(pack.warrant || []).map((l, i) => <li key={i}>{l}</li>)}</ol>
          {pack.final?.task && <p className="chase-read">{pack.final.task}</p>}
          <form className="chase-row" onSubmit={async e => { e.preventDefault(); if (await keyFits(pack, key)) setS(x => ({ ...x, step: 'caught' })); else setBad(true) }}>
            <label className="chase-field">{W.key}<input value={key} onChange={e => { setBad(false); setKey(e.target.value) }} autoComplete="off" spellCheck="false" /></label>
            <button type="submit" className="chase-btn">{W.enter}</button>
          </form>
          {bad && <p className="chase-miss" role="status">{W.keyWrong}</p>}
        </section>}

        {s.step === 'caught' && <section className="chase-card">
          <div className="chase-stamp" aria-label={pack.final?.stamp || W.caught}>{pack.final?.stamp || W.caught}</div>
          {pack.coda && <p className="chase-read">{pack.coda.text}{pack.coda.source && <small className="chase-src"> {pack.coda.source}</small>}</p>}
          {pack.end && <div className="chase-end">
            {pack.end.photo && <figure className="chase-photo"><img src={pic(pack.end.photo)} alt={pack.end.alt || ''} /><figcaption className="chase-src">{pack.end.credit}</figcaption></figure>}
            {(pack.end.lines || []).map((l, i) => <p key={i} className="chase-read">{l}</p>)}
          </div>}
          <ol className="chase-reflect">{(pack.reflection || []).map((q, i) => <li key={i}>{q}</li>)}</ol>
          <div className="chase-row"><button type="button" className="chase-ghost" onClick={() => { writeChase(null); setS({ ...fresh(), step: 'intro' }) }}>{W.again}</button></div>
        </section>}
      </div>
      <BottomBack onBack={onBack} back={course.label} />
    </div>
  )
}

// The case-file look, scoped to the chase (and its bar). Contrast as Case Closed: ink on manila 12:1,
// red on manila 5.1:1, edges 4.6:1. Meaning never by colour alone.
export const CHASE_STYLES = `
.chase{--cc-manila:#E8D6A6;--cc-tab:#D9C285;--cc-paper:#FBF5E6;--cc-ink:#1F1A14;--cc-ink-2:#4E4232;--cc-edge:#6E5A30;--cc-red:#A3261E;--cc-green:#1E6634;--cc-sticky:#FFF0A8}
.chase-wrap{max-width:760px}
.chase-standing{font:700 13px/1.3 "Courier Prime",monospace;letter-spacing:.06em;text-transform:uppercase;color:#E8B04B;margin:4px 0 10px}
.chase-card{background:var(--cc-manila);color:var(--cc-ink);border:2px solid var(--cc-edge);border-top:12px solid var(--cc-tab);border-radius:4px 4px 8px 8px;padding:14px 16px;margin:0 0 14px;box-shadow:0 10px 26px -10px #000c}
.chase-card p{margin:0 0 10px}
.chase-tab{display:inline-block;background:var(--cc-paper);border:1px solid var(--cc-edge);padding:2px 10px;font:700 14px/1.3 "Courier Prime",monospace;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:8px}
.chase-h{font:700 22px/1.2 "Courier Prime",monospace;margin:4px 0 6px;text-shadow:none;color:var(--cc-ink)}
.chase-card h2{text-shadow:none;color:var(--cc-ink)}
.chase-read{font-size:18px;line-height:1.5}
.chase-suspect{display:flex;gap:12px;align-items:center;margin:6px 0 10px}
.chase-suspect img{width:96px;height:96px;object-fit:cover;border:2px solid var(--cc-ink);background:var(--cc-paper)}
.chase-suspect h2{font:700 24px/1.1 "Courier Prime",monospace;margin:0 0 4px}
.chase-row{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end;margin:10px 0}
.chase-btn{background:var(--cc-ink);color:var(--cc-paper);border:2px solid var(--cc-ink);border-radius:6px;padding:9px 18px;font:700 18px/1 "Courier Prime",monospace;letter-spacing:1px;text-transform:uppercase;min-height:44px;cursor:pointer}
.chase-btn:disabled{opacity:.5;cursor:not-allowed}
.chase-ghost{background:var(--cc-paper);color:var(--cc-ink);border:1px solid var(--cc-edge);border-radius:6px;padding:8px 14px;min-height:40px;cursor:pointer}
.chase-tool{display:inline-block;background:#0B1220;color:#E3B341;border:2px solid #E3B341;border-radius:6px;padding:9px 16px;font:700 17px/1 "Barlow Condensed",sans-serif;letter-spacing:.06em;text-transform:uppercase;text-decoration:none;min-height:44px}
.chase-ask{border-top:2px dashed var(--cc-edge);padding-top:10px;margin-top:6px}
.chase-prompt{font-weight:700;font-size:19px}
.chase-opts{display:flex;flex-direction:column;gap:8px}
.chase-opt{text-align:left;background:var(--cc-paper);color:var(--cc-ink);border:1px solid var(--cc-edge);border-left:6px solid var(--cc-edge);border-radius:3px;padding:10px 12px;min-height:44px;cursor:pointer;font:inherit}
.chase-opt.on{border-color:var(--cc-red);border-left-width:10px;box-shadow:inset 0 0 0 2px var(--cc-red)}
.chase-field{display:flex;flex-direction:column;gap:4px;font-weight:700;color:var(--cc-ink-2)}
.chase-field input{font:700 22px/1 "Courier Prime",monospace;background:var(--cc-paper);color:var(--cc-ink);border:2px solid var(--cc-edge);border-radius:4px;padding:8px 10px;min-width:220px}
.chase-miss{color:var(--cc-red);font-weight:700}
.chase-right{color:var(--cc-green);font-weight:700;font-size:21px}
.chase-hint{background:var(--cc-sticky);border:1px solid #C9B65A;padding:7px 10px;margin:8px 0;color:var(--cc-ink)}
.chase-doc{margin:0 0 10px;background:var(--cc-paper);border:1px solid var(--cc-edge);padding:10px 12px}
.chase-doc figcaption{font:700 14px/1.3 "Courier Prime",monospace;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px}
.chase-doc img{max-width:100%;display:block;border:1px solid var(--cc-edge)}
.chase-doctext p{margin:0 0 8px}
.chase-src{font-size:14px;font-style:italic;color:var(--cc-ink-2);margin-top:6px}
.chase-evcard{background:var(--cc-paper);border:2px solid var(--cc-ink);padding:10px 12px;font:700 18px/1.35 "Courier Prime",monospace;margin:8px 0}
.chase-evcard span{display:block;font:700 12px/1.2 "Courier Prime",monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--cc-red);margin-bottom:4px}
.chase-near{background:#2a1410;color:#FFD9CF;border-left:6px solid var(--cc-red);padding:8px 10px;font-weight:700}
.chase-evlist,.chase-wlines,.chase-reflect{padding-left:22px}
.chase-evlist li{font:700 16px/1.4 "Courier Prime",monospace;margin:4px 0}
.chase-wlines li{margin:6px 0;border-bottom:1px solid var(--cc-edge);padding-bottom:4px}
.chase-stamp{display:inline-block;font:700 44px/1 "Courier Prime",monospace;letter-spacing:6px;color:var(--cc-red);border:4px solid var(--cc-red);border-radius:6px;padding:6px 16px;transform:rotate(-3deg);margin:6px 0 14px}
.chase-trail{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;margin:0 0 12px;color:#F4F6FA}
.chase-pin{font:700 13px/1 "Courier Prime",monospace;letter-spacing:.1em;text-transform:uppercase;color:#E8B04B}
.chase-prints{display:flex;gap:6px}
.chase-prints i{width:14px;height:20px;border-radius:50% 50% 45% 45%;background:#E8D6A6;transition:opacity .4s ease, transform .4s ease}
.chase-prints i:nth-child(even){transform:translateY(5px)}
.chase-prints i.faded{opacity:.18;transform:scale(.8)}
.chase-trail em{font-style:normal;font-weight:600}
.chase-bar{position:fixed;right:12px;bottom:12px;z-index:1100;display:flex;align-items:center;gap:8px;background:#E8D6A6;color:#1F1A14;border:2px solid #1F1A14;border-radius:999px;padding:8px 14px;text-decoration:none;box-shadow:0 8px 22px -8px #000;font:700 14px/1.1 "Courier Prime",monospace;max-width:calc(100vw - 24px)}
.chase-bar span:last-child{font-weight:400;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.chase-bar-dot{width:10px;height:10px;border-radius:50%;background:#A3261E;flex:none}
.chase-story{font-size:17px;line-height:1.5;background:var(--cc-paper);border-left:6px solid var(--cc-edge);padding:8px 12px;margin:0 0 10px}
.chase-meter{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;margin:0 0 12px;color:#F4F6FA}
.chase-pips{display:flex;gap:4px;flex-wrap:wrap}
.chase-pips i{width:22px;height:22px;border:2px solid #E8D6A6;border-radius:4px;display:grid;place-items:center;font:700 13px/1 "Courier Prime",monospace;font-style:normal;color:#1F1A14;transition:background .3s ease, transform .3s ease}
.chase-pips i.on{background:#E3B341;border-color:#E3B341;transform:scale(1.06)}
.chase-meter em{font-style:normal;font-weight:600}
.chase-meterline{font-size:16px;background:var(--cc-paper);border:1px dashed var(--cc-edge);padding:8px 10px}
.chase-stamp-door{font-size:34px;color:var(--cc-green);border-color:var(--cc-green)}
.chase-suspect figure{margin:0;flex:none;max-width:140px}
.chase-suspect figure img{width:120px;height:auto;max-height:150px}
.chase-suspect figcaption{font-size:12px;line-height:1.3}
.chase-photo{margin:6px 0 12px}
.chase-photo img{width:100%;max-width:560px;display:block;border:2px solid var(--cc-ink);background:var(--cc-paper)}
@media (prefers-reduced-motion:reduce){.chase-prints i,.chase-pips i{transition:none}.chase-stamp{transform:none}.chase-pips i.on{transform:none}}
@media (max-width:560px){.chase-bar{left:12px;right:12px;bottom:56px}}
`
