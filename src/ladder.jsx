// ============================================================
// THE ARENA — SKILL LADDERS, GAUGES, UNIT REVIEW   (built 2026-09-25, Josh)
//
// BK's rulings this file keeps (2026-09-24):
//   • The ladder lives in each UNIT ROOM — one L1–L5 ladder per skill lane,
//     ported from that unit's casefile. Skill cards keep their generic drills.
//   • L5 is content enrichment, not a timed cold write. No timer anywhere.
//   • Every level is open at all times. No locks. "Start here" is a suggestion.
//   • Progress memory is LEVEL NUMBERS ONLY, on this device only
//     (localStorage `arena_progress_v1`). No reset button (1:1 district).
//     A wiped or blocked store returns a room where every gauge reads
//     "Not started" — never a broken room (canon §1: convenience, never a
//     dependency). Save codes are NOT in this build.
//   • Nothing a student types is ever kept. L4 and L5 writing lives in React
//     state only: no localStorage, no network, gone when the tab closes.
//     That is what keeps the ladder outside Ed Law 2-d.
//
// Everything here reads from the manifest. Adding the 11.2 room is a manifest
// edit plus content files — no code change.
// ============================================================
import { useState, useEffect, useMemo } from 'react'

// ── PROGRESS (this device only, level numbers only) ───────────────────────
const PROGRESS_KEY = 'arena_progress_v1'

// Keep only what the contract allows: { roomKey: { SKILL: [1..5] } }.
// Anything else found in the key is dropped on read, never trusted.
function clean(raw) {
  const out = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out
  for (const [room, skills] of Object.entries(raw)) {
    if (!skills || typeof skills !== 'object' || Array.isArray(skills)) continue
    for (const [skill, levels] of Object.entries(skills)) {
      if (!/^[A-Z]{2,3}$/.test(skill) || !Array.isArray(levels)) continue
      const ok = [...new Set(levels.filter(n => Number.isInteger(n) && n >= 1 && n <= 5))].sort()
      if (ok.length) (out[room] ||= {})[skill] = ok
    }
  }
  return out
}

export function readProgress() {
  try { return clean(JSON.parse(window.localStorage.getItem(PROGRESS_KEY) || '{}')) }
  catch { return {} }
}

export function writeProgress(p) {
  try { window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(clean(p))) } catch { /* storage off: room still works */ }
}

// A room key is course + unit slug. Two courses both have a "unit-1"; a key of
// the slug alone would let a Global kid's progress light a US gauge.
export const roomKey = (course, unit) => `${course.id}:${unit.slug}`

export function useProgress() {
  const [prog, setProg] = useState(() => readProgress())
  const mark = (course, unit, skill, level) => {
    setProg(cur => {
      const k = roomKey(course, unit)
      const had = cur[k]?.[skill] || []
      if (had.includes(level)) return cur
      const next = { ...cur, [k]: { ...(cur[k] || {}), [skill]: [...had, level].sort() } }
      writeProgress(next)
      return next
    })
  }
  return [prog, mark]
}

export const levelsDone = (prog, course, unit, skill) => prog?.[roomKey(course, unit)]?.[skill] || []

// ── SKILLS IN A ROOM ──────────────────────────────────────────────────────
// Read from the course's station cards: one gauge per skill line, live or dark
// from each card's own `published` flag. Never hardcoded here.
export function roomSkills(course, unit) {
  const lines = course?.skill_lines?.lines || []
  const ladders = unit?.ladders || []
  return (course?.stations || []).map(s => {
    const code = (s.skill_lines || [])[0]
    const line = lines.find(l => l.code === code)
    return {
      code,
      name: line?.label || s.name,
      live: s.published === true && (s.status ?? 'open') !== 'building',
      ladder: ladders.find(l => l.skill === code) || null,
    }
  }).filter(s => s.code)
}

// A level is playable only if it is published AND its content resolves.
export const levelOpen = lv => lv?.published === true && typeof lv.content_ref === 'string' && lv.content_ref.length > 0

// Five slots, always. A skill with no ladder yet, or a ladder missing a level,
// still shows all five — the missing ones read "Coming".
export function ladderLevels(ladder) {
  return [1, 2, 3, 4, 5].map(n => (ladder?.levels || []).find(l => l.level === n) || { level: n, type: null, published: false })
}

// ── LEVEL TYPES ───────────────────────────────────────────────────────────
// Short name + one line the student reads on the level card. Adding a type is
// a build on this desk; the manifest names it, this table explains it.
export const LEVEL_TYPES = {
  matching:       { name: 'Match it',          blurb: 'Pair each one with its match.' },
  mc_bestfit:     { name: 'Pick the best fit', blurb: 'Four statements. Pick the one that fits best.' },
  sentence_build: { name: 'Build the sentence', blurb: 'Put the context sentence together, one piece at a time.' },
  guided_write:   { name: 'Write it',          blurb: 'Two or three sentences, with the checklist right beside you.' },
  enrichment:     { name: 'Gold dust',         blurb: 'Already writing at a 4? Here’s what gets it to a 5.' },
}

// ── THE GAUGE ─────────────────────────────────────────────────────────────
// Brass face is raster art (Gemini, BK approved 2026-09-24). Everything that
// carries meaning — stops, ticks, needle — is drawn here in SVG, and the text
// line under the gauge says the same thing in words. The needle is never the
// only signal.
const SWEEP = 240, START = -120                // lower-left to lower-right
const angleOf = v => START + v * (SWEEP / 5)    // v: 0 (E) … 5
const pt = (deg, r) => {
  const a = (deg * Math.PI) / 180
  return [50 + r * Math.sin(a), 50 - r * Math.cos(a)]
}
const STOPS = ['E', '1', '2', '3', '4', '5']

function prefersReducedMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return true }
}

export function GaugeFace({ value = 0, dark = false, size = 160 }) {
  // Sweep up from E on first paint — only when motion is welcome.
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? value : 0))
  useEffect(() => {
    if (prefersReducedMotion()) { setShown(value); return }
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(value)))
    return () => cancelAnimationFrame(id)
  }, [value])

  const majors = STOPS.map((_, i) => angleOf(i))
  const minors = []
  for (let i = 0; i < 5; i++) for (let j = 1; j < 4; j++) minors.push(angleOf(i + j / 4))

  return (
    <div className={`gauge-face${dark ? ' dark' : ''}`} style={{ width: size }} aria-hidden="true">
      <img src="/images/arena/gauge-face.webp" alt="" width="480" height="480" />
      <svg viewBox="0 0 100 100">
        {minors.map((d, i) => {
          const [x1, y1] = pt(d, 33.6), [x2, y2] = pt(d, 36)
          return <line key={`m${i}`} x1={x1} y1={y1} x2={x2} y2={y2} className="g-minor" />
        })}
        {majors.map((d, i) => {
          const [x1, y1] = pt(d, 30.5), [x2, y2] = pt(d, 36)
          return <line key={`M${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
                       className={`g-major${!dark && i <= value && value > 0 ? ' lit' : ''}`} />
        })}
        {!dark && (
          <g className="g-needle" style={{ transform: `rotate(${angleOf(shown)}deg)` }}>
            <polygon points="50,19.5 51.1,50 50,54.5 48.9,50" />
          </g>
        )}
        {/* Numbers paint AFTER the needle, with a face-coloured halo, so the needle
            can never cover the stop it is pointing at (fix from the mockup). */}
        {STOPS.map((s, i) => {
          const [x, y] = pt(angleOf(i), 23.8)
          const on = !dark && i === value
          return <text key={s} x={x} y={y} className={`g-num${on ? ' on' : ''}`}
                       textAnchor="middle" dominantBaseline="central">{s}</text>
        })}
        <circle cx="50" cy="50" r="4.2" className="g-hub" />
        <circle cx="50" cy="50" r="1.6" className="g-hub-core" />
        {dark && <text x="50" y="71" className="g-coming" textAnchor="middle">COMING</text>}
      </svg>
    </div>
  )
}

export const statusLine = top => (top ? `Level ${top} of 5 done` : 'Not started')

export function SkillGauges({ course, unit, prog, onOpen }) {
  const skills = roomSkills(course, unit)
  if (!skills.length) return null
  return (
    <div className="gauges">
      {skills.map(s => {
        const done = levelsDone(prog, course, unit, s.code)
        const top = done.length ? Math.max(...done) : 0
        if (!s.live) {
          return (
            <div key={s.code} className="gauge off">
              <GaugeFace dark />
              <div className="gauge-name">{s.name}</div>
              <div className="gauge-status"><span className="flag soon">Coming</span></div>
            </div>
          )
        }
        return (
          <button key={s.code} type="button" className="gauge" onClick={() => onOpen(s.code)}
                  aria-label={`${s.name}. ${statusLine(top)}. Open the ladder.`}>
            <GaugeFace value={top} />
            <div className="gauge-name">{s.name}</div>
            <div className="gauge-status">{statusLine(top)}</div>
          </button>
        )
      })}
    </div>
  )
}

// ── THE LADDER (five level cards) ─────────────────────────────────────────
export function Ladder({ course, unit, skill, prog, onOpenLevel }) {
  const s = roomSkills(course, unit).find(x => x.code === skill)
  const levels = ladderLevels(s?.ladder)
  const done = levelsDone(prog, course, unit, skill)
  const top = done.length ? Math.max(...done) : 0
  const startHere = levels.find(l => levelOpen(l) && !done.includes(l.level))?.level
  return (
    <div className="detail" style={{ maxWidth: 820 }}>
      <div className="ladder-head">
        <GaugeFace value={top} size={150} />
        <div>
          <h2>{s?.name || skill}</h2>
          <p className="sub" style={{ marginBottom: 6 }}>{statusLine(top)}</p>
          <p className="ladder-note">{levels.some(levelOpen)
            ? 'Every level is open. Start anywhere — the tag shows a good place to begin.'
            : 'This ladder isn’t built yet. Its levels open here as they’re added.'}</p>
        </div>
      </div>
      <ol className="ladder">
        {levels.map(lv => {
          const t = LEVEL_TYPES[lv.type]
          const open = levelOpen(lv)
          const isDone = done.includes(lv.level)
          const body = (
            <>
              <span className="rung-n" aria-hidden="true">{lv.level}</span>
              <span className="rung-body">
                <span className="card-type">Level {lv.level}{t ? ` · ${t.name}` : ''}</span>
                <span className="rung-name">{open ? (lv.label || t?.name) : (lv.label || t?.name || 'Not built yet')}</span>
                {open && t && <span className="card-blurb">{t.blurb}</span>}
              </span>
              <span className="rung-flags">
                {!open && <span className="flag soon">Coming</span>}
                {open && isDone && <span className="flag done">Done</span>}
                {open && !isDone && lv.level === startHere && <span className="flag live">Start here</span>}
              </span>
            </>
          )
          return (
            <li key={lv.level}>
              {open
                ? <button type="button" className="rung" onClick={() => onOpenLevel(lv.level)}>{body}</button>
                : <div className="rung off">{body}</div>}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

// ── L2 · PICK THE BEST FIT ────────────────────────────────────────────────
// Ported from builds/review-bowl/src/ui/Question.jsx: one committed pick, two
// escalating hints on request, verdict as a WORD first. The Review Bowl's
// season/playoff rule is a game rule and stays in the game — the ladder always
// offers both hints (Josh, 2026-09-24 pass; Sam did not object).
function BestFitItem({ item, n, total, onAnswered }) {
  const [picked, setPicked] = useState(null)
  const [shown, setShown] = useState(0)
  const opts = Object.entries(item.options || {}).map(([key, text]) => ({ key, text }))
  const hints = item.hints || []
  const answered = picked != null
  const right = answered && picked === item.correct
  const choose = k => { if (picked == null) { setPicked(k); onAnswered() } }
  return (
    <div className="mc-item">
      <div className="mc-head"><span className="mc-count">Question {n} of {total}</span></div>
      <div className="mc-q">{item.stem}</div>
      <div className="mc-choices">
        {opts.map(o => {
          let cls = 'mc-choice'
          if (answered) cls += o.key === item.correct ? ' correct' : o.key === picked ? ' incorrect' : ' dim'
          return (
            <button key={o.key} type="button" className={cls} disabled={answered} onClick={() => choose(o.key)}>
              <b>{o.key}.</b> <span>{o.text}</span>
              {answered && o.key === item.correct && <em className="mc-mark">Correct</em>}
              {answered && o.key === picked && !right && <em className="mc-mark">Not this one</em>}
            </button>
          )
        })}
      </div>
      {!answered && hints.length > 0 && (
        <div className="hints">
          {hints.slice(0, shown).map((h, i) => <p key={i} className="hint"><b>Hint {i + 1}</b> {h}</p>)}
          {shown < hints.length && (
            <button type="button" className="btn-ghost" onClick={() => setShown(s => s + 1)}>
              {shown === 0 ? 'Show a hint' : 'Show the second hint'}
            </button>
          )}
        </div>
      )}
      {answered && (
        <div className="mc-reveal" role="status">
          <p className="mc-reasoning">{right ? 'Correct.' : `Not quite — the best fit is ${item.correct}.`}</p>
        </div>
      )}
    </div>
  )
}

export function BestFit({ pack, onComplete }) {
  const items = pack?.items || []
  const [count, setCount] = useState(0)
  useEffect(() => { if (items.length && count >= items.length) onComplete() }, [count])
  return (
    <>
      <p className="mc-preamble">Pick the statement that fits best. Stuck? Take a hint — there are two on every question. Nothing here is scored or saved.</p>
      {items.map((it, i) => (
        <BestFitItem key={it.id || i} item={it} n={i + 1} total={items.length} onAnswered={() => setCount(c => c + 1)} />
      ))}
      {items.length > 0 && count >= items.length && <p className="level-done" role="status">Level done. Head back to the ladder for the next one.</p>}
    </>
  )
}

// ── L3 · BUILD THE SENTENCE ───────────────────────────────────────────────
// Tap a piece for each blank. No drag-and-drop at all — keyboard, trackpad and
// touch get the same activity (same floor as matching). Tiles reshuffle on
// every attempt; a correct blank stays put when you try again.
function shuffle(arr) {
  const a = (arr || []).slice()
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

export function SentenceBuild({ pack, onComplete }) {
  const blanks = pack?.blanks || []
  const parts = String(pack?.sentence_frame || '').split('___')
  const [attempt, setAttempt] = useState(0)
  const order = useMemo(() => blanks.map(b => shuffle(b.tiles)), [pack, attempt])
  const [chosen, setChosen] = useState({})      // blank_id -> tile text
  const [checked, setChecked] = useState(false)
  const isRight = b => (b.tiles || []).find(t => t.text === chosen[b.blank_id])?.correct === true
  const allFilled = blanks.length > 0 && blanks.every(b => chosen[b.blank_id])
  const allRight = checked && blanks.every(isRight)
  useEffect(() => { if (allRight) onComplete() }, [allRight])

  const tryAgain = () => {
    setChosen(c => Object.fromEntries(Object.entries(c).filter(([id]) => isRight(blanks.find(b => String(b.blank_id) === id)))))
    setChecked(false)
    setAttempt(a => a + 1)
  }

  return (
    <div className="build">
      <p className="mc-preamble">Choose one piece for each blank. When every blank is filled, check your sentence.</p>
      <p className="frame" aria-live="polite">
        {parts.map((p, i) => (
          <span key={i}>
            {p}
            {i < blanks.length && (
              <span className={`slot${chosen[blanks[i].blank_id] ? ' filled' : ''}${checked ? (isRight(blanks[i]) ? ' ok' : ' miss') : ''}`}>
                {chosen[blanks[i].blank_id] || blanks[i].label}
              </span>
            )}
          </span>
        ))}
      </p>

      {blanks.map((b, i) => (
        <fieldset key={b.blank_id} className="tile-group" disabled={checked}>
          <legend>Blank {i + 1} · {b.label}
            {checked && <em className={`mc-mark ${isRight(b) ? 'ok' : 'miss'}`} style={{ marginLeft: 10 }}>{isRight(b) ? 'Correct' : 'Not this one'}</em>}
          </legend>
          <div className="tiles">
            {order[i].map(t => {
              const on = chosen[b.blank_id] === t.text
              return (
                <button key={t.text} type="button" aria-pressed={on}
                        className={`tile${on ? ' on' : ''}`}
                        onClick={() => setChosen(c => ({ ...c, [b.blank_id]: t.text }))}>
                  {t.text}
                </button>
              )
            })}
          </div>
        </fieldset>
      ))}

      {!checked && (
        <button type="button" className="rep-go" disabled={!allFilled} onClick={() => setChecked(true)}>
          {allFilled ? 'Check my sentence' : `Fill every blank first — ${blanks.length - Object.keys(chosen).length} to go`}
        </button>
      )}
      {checked && !allRight && (
        <div className="rep-reveal">
          <p className="mc-preamble">The pieces marked “Not this one” don’t fit. Your correct pieces stay; the rest reshuffle.</p>
          <button type="button" className="rep-go" onClick={tryAgain}>Try again</button>
        </div>
      )}
      {allRight && (
        <div className="rep-reveal" role="status">
          <h4>Your sentence</h4>
          <p className="rep-exemplar">{pack.correct_sentence}</p>
          <p className="level-done">Level done. Head back to the ladder for the next one.</p>
        </div>
      )}
    </div>
  )
}

// ── L4 · WRITE IT ─────────────────────────────────────────────────────────
// Checklist visible the whole time, not a hint you ask for. What the kid types
// is React state and nothing else: never stored, never sent, gone with the tab.
export function GuidedWrite({ pack, accent, onComplete }) {
  const starter = String(pack?.sentence_starter || '').replace(/_{2,}\s*$/, '').trimEnd()
  const seed = starter ? `${starter} ` : ''
  const [text, setText] = useState(seed)
  const [checks, setChecks] = useState({})
  const [done, setDone] = useState(false)
  const MIN = 20
  const written = text.trim().length - seed.trim().length
  const ready = written >= MIN
  return (
    <div className="write">
      <figure className="stimulus" style={{ borderColor: `${accent}44` }}>
        {pack.source_document && <div className="doc-tag">{pack.source_document}</div>}
        <div className="stimulus-text"><p>{pack.source_text}</p></div>
      </figure>
      <p className="rep-prompt">{pack.prompt}</p>
      <div className="write-grid">
        <div>
          <label className="rep-label" htmlFor="l4-write">Your answer</label>
          <textarea id="l4-write" className="rep-box" rows={7} value={text} readOnly={done}
                    onChange={e => setText(e.target.value)} />
          <p className="rep-why">Nothing you write here is saved or sent. It’s gone when you close the tab.</p>
        </div>
        <aside className="checklist" aria-label="Checklist">
          <div className="rep-label">Before you’re done</div>
          <ul className="rep-check">
            {(pack.checklist || []).map((c, i) => (
              <li key={i}><label>
                <input type="checkbox" checked={!!checks[i]} onChange={e => setChecks(s => ({ ...s, [i]: e.target.checked }))} />
                <span>{c}</span>
              </label></li>
            ))}
          </ul>
        </aside>
      </div>
      {!done ? (
        <button type="button" className="rep-go" disabled={!ready} onClick={() => { setDone(true); onComplete() }}>
          {ready ? 'I’m done' : `Write a bit more first — ${Math.max(0, MIN - written)} characters to go`}
        </button>
      ) : (
        <div className="rep-reveal" role="status">
          <h4>One strong answer</h4>
          <p className="rep-exemplar">{pack.model_response}</p>
          <p className="rep-focus">Hold yours next to it. Go down the checklist again — which of the three did yours do, and which did this one do?</p>
          <p className="level-done">Level done. Head back to the ladder for the next one.</p>
        </div>
      )}
    </div>
  )
}

// ── L5 · GOLD DUST ────────────────────────────────────────────────────────
// Enrichment, not a test. No timer, no score, and the try-it box is never kept.
export function Enrichment({ pack, onComplete }) {
  const [tryText, setTryText] = useState('')
  const [done, setDone] = useState(false)
  const ex = pack?.exemplars || []
  return (
    <div className="enrich">
      {(pack.tidbits || []).length > 0 && (
        <section>
          <h3 className="set-heading">Gold dust</h3>
          <div className="tidbits">
            {pack.tidbits.map(t => (
              <article key={t.id} className="tidbit">
                {t.thread && <div className="line-chip">{t.thread}</div>}
                <p>{t.text}</p>
                {t.source_pointer && <div className="source-ptr">Source: {t.source_pointer}</div>}
              </article>
            ))}
          </div>
        </section>
      )}
      {ex.length > 0 && (
        <section>
          <h3 className="set-heading">A 4 and a 5, side by side</h3>
          <div className="exemplars">
            {ex.map((e, i) => (
              <article key={i} className={`exemplar lv${e.level}`}>
                <div className="ex-badge">This is a {e.level}</div>
                <p className="rep-exemplar">{e.text}</p>
                {e.what_changed && <p className="rep-focus"><b>What changed:</b> {e.what_changed}</p>}
              </article>
            ))}
          </div>
        </section>
      )}
      {(pack.techniques || []).length > 0 && (
        <section>
          <h3 className="set-heading">The moves</h3>
          <dl className="techniques">
            {pack.techniques.map((t, i) => (
              <div key={i} className="technique"><dt>{t.name}</dt><dd>{t.explanation}</dd></div>
            ))}
          </dl>
        </section>
      )}
      {pack.try_it?.prompt && (
        <section>
          <h3 className="set-heading">Try it</h3>
          <p className="rep-prompt">{pack.try_it.prompt}</p>
          <label className="rep-label" htmlFor="l5-try">Your thinking (optional)</label>
          <textarea id="l5-try" className="rep-box" rows={5} value={tryText} onChange={e => setTryText(e.target.value)} />
          {pack.try_it.status && <p className="rep-why">{pack.try_it.status}</p>}
        </section>
      )}
      {!done
        ? <button type="button" className="rep-go" onClick={() => { setDone(true); onComplete() }}>I’m done</button>
        : <p className="level-done" role="status">Level 5 done. That’s the whole ladder for this skill.</p>}
    </div>
  )
}

// ── UNIT REVIEW (unit_brief) ──────────────────────────────────────────────
// The unit's Google Classroom content brief, rendered on the page (BK, 2026-09-25:
// render it directly rather than link a PDF — it reflows at any zoom, reads aloud,
// and downloads nothing). Headings and wording are the authoring desk's, verbatim.
// Quick Check shows each answer under its question — BK's ruling 2026-09-25 via Sam,
// replacing the build order's "questions only". Nothing is typed, nothing is saved.
// No dates anywhere: unit dates live in Classroom, never the Arena (Sam, 2026-09-18).
const Sec = ({ h, children }) => (
  <section className="brief-sec"><h3 className="set-heading">{h}</h3>{children}</section>
)
export function UnitBrief({ brief }) {
  if (!brief) return null
  const hu = brief.how_to_use, ta = brief.thread_anchor, bg = brief.background
  const kf = brief.key_facts, ex = brief.exam, tm = brief.three_move, qc = brief.quick_check
  const cols = kf?.columns || ['Term / Event', 'Key Detail', 'Thread Connection']
  return (
    <div className="brief">
      {brief.subtitle && <p className="brief-sub">{brief.subtitle}</p>}
      {hu && <Sec h={hu.heading}>
        {hu.lead && <p className="brief-p">{hu.lead}</p>}
        <ol className="brief-list">{(hu.steps || []).map((x, i) => <li key={i}>{x}</li>)}</ol>
        {hu.connects_to && <p className="brief-note">{hu.connects_to}</p>}
      </Sec>}
      {ta && <Sec h={ta.heading}>
        <article className="anchor primary">
          <div className="card-name">{ta.label}</div>
          {ta.question && <p className="anchor-q">{ta.question}</p>}
          {ta.question_note && <p className="brief-p">{ta.question_note}</p>}
          {ta.lead && <p className="brief-lead">{ta.lead}</p>}
          {(ta.points || []).map((p, i) => <p key={i} className="brief-p">{p}</p>)}
          {ta.after && <p className="brief-p">{ta.after}</p>}
        </article>
        {bg && <article className="anchor bg">
          <div className="card-type">{bg.heading}</div>
          <p className="brief-p">{bg.text}</p>
        </article>}
      </Sec>}
      {kf && <Sec h={kf.heading}>
        {kf.note && <p className="brief-note">{kf.note}</p>}
        <table className="tbl facts">
          <thead><tr>{cols.map(c => <th key={c} scope="col">{c}</th>)}</tr></thead>
          <tbody>{(kf.rows || []).map((f, i) => (
            <tr key={i}><th scope="row" data-label={cols[0]}>{f.term}</th>
              <td data-label={cols[1]}>{f.detail}</td><td data-label={cols[2]}>{f.thread}</td></tr>
          ))}</tbody>
        </table>
      </Sec>}
      {ex && <Sec h={ex.heading}>
        {ex.text && <p className="brief-p">{ex.text}</p>}
        {ex.watch_lead && <p className="brief-lead">{ex.watch_lead}</p>}
        <ul className="watch">{(ex.watch_for || []).map((w, i) => (
          <li key={i}><span className="cue">{w.cue}</span><span className="arrow" aria-hidden="true">→</span><span className="sr">then</span> <span>{w.move}</span></li>
        ))}</ul>
      </Sec>}
      {tm && <Sec h={tm.heading}>
        {tm.intro && <p className="brief-p">{tm.intro}</p>}
        <ol className="moves">{(tm.moves || []).map((m, i) => (
          <li key={i}><b>{m.move}</b>{m.starter && <span className="starter"><em>Starter:</em> {m.starter}</span>}</li>
        ))}</ol>
      </Sec>}
      {qc && <Sec h={qc.heading}>
        {qc.intro && <p className="brief-note">{qc.intro}</p>}
        <ol className="qc">{(qc.items || []).map((it, i) => (
          <li key={i}><p className="qc-q">{it.q}</p>{it.a && <p className="qc-a">{it.a}</p>}</li>
        ))}</ol>
      </Sec>}
    </div>
  )
}

// ── STYLES ────────────────────────────────────────────────────────────────
export const LADDER_STYLES = `
/* ---------- GAUGES ---------- */
.room-section{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.14em;
  font-size:14px;color:var(--gold);margin:6px 0 14px}
.room-section + .room-sub{color:var(--grey);font-size:16px;line-height:1.55;margin:-6px 0 18px;max-width:720px}
.gauges{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:34px}
@media (min-width:1200px){.gauges{grid-template-columns:repeat(6,1fr)}}
.gauge{display:flex;flex-direction:column;align-items:center;gap:6px;padding:16px 10px 14px;border-radius:14px;
  background:color-mix(in srgb,var(--card) 80%,transparent);border:1px solid var(--edge);color:inherit;
  font-family:'Outfit',sans-serif;cursor:pointer}
button.gauge:hover{border-color:var(--gold);background:var(--card-lit);transform:translateY(-2px)}
.gauge.off{cursor:default}
.gauge-name{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.06em;
  font-size:21px;font-weight:600;color:var(--white);text-align:center;line-height:1.1;margin-top:4px}
.gauge.off .gauge-name{color:var(--dim)}
.gauge-status{color:var(--grey);font-size:15px}
.gauge-face{position:relative;flex:none;max-width:100%;aspect-ratio:1}
.gauge-face img,.gauge-face svg{position:absolute;inset:0;display:block;width:100%;height:100%}
.gauge-face.dark img{filter:grayscale(.85) brightness(.42)}
.g-minor{stroke:var(--gold);stroke-width:.7;stroke-linecap:round;opacity:.75}
.g-major{stroke:var(--gold);stroke-width:2.2;stroke-linecap:round;opacity:.85}
.g-major.lit{opacity:1;stroke:var(--gold-lit)}
.gauge-face.dark .g-minor,.gauge-face.dark .g-major{stroke:#3B4B62;opacity:.9}
.g-num{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:7.6px;fill:var(--grey);
  paint-order:stroke;stroke:#0E1524;stroke-width:2.4px;stroke-linejoin:round}
.g-num.on{fill:var(--white);font-size:9px}
.gauge-face.dark .g-num{fill:#44536B}
.g-needle{transform-box:view-box;transform-origin:50% 50%;transition:transform .9s cubic-bezier(.2,.8,.25,1.05)}
.g-needle polygon{fill:var(--white);filter:drop-shadow(0 0 .6px #000)}
.g-hub{fill:#1a1408;stroke:var(--gold);stroke-width:1.3}
.g-hub-core{fill:#3a2e14}
.gauge-face.dark .g-hub{stroke:#3B4B62}
.g-coming{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:7px;letter-spacing:.2em;fill:var(--grey)}

/* ---------- LADDER ---------- */
.ladder-head{display:flex;gap:22px;align-items:center;margin-bottom:22px;flex-wrap:wrap}
.ladder-head h2{margin-bottom:4px}
.ladder-note{color:var(--grey);font-size:15.5px;line-height:1.5;max-width:520px}
.ladder{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:10px;position:relative}
.rung{display:flex;align-items:center;gap:16px;width:100%;text-align:left;padding:16px 18px;border-radius:12px;
  background:var(--card);border:1px solid var(--edge);color:inherit;font-family:'Outfit',sans-serif;cursor:pointer}
button.rung:hover{background:var(--card-lit);border-color:var(--gold);transform:translateX(3px)}
.rung.off{opacity:.5;cursor:default}
.rung-n{flex:none;width:42px;height:42px;border-radius:50%;display:grid;place-items:center;
  border:2px solid var(--gold);color:var(--gold);font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:700}
.rung.off .rung-n{border-color:var(--edge);color:var(--dim)}
.rung-body{display:flex;flex-direction:column;gap:3px;flex:1;min-width:0}
.rung-body .card-type{margin-bottom:0}
.rung-name{font-family:'Barlow Condensed',sans-serif;font-size:22px;text-transform:uppercase;color:var(--white);line-height:1.12}
.rung.off .rung-name{color:var(--dim)}
.rung-flags{flex:none;display:flex;gap:6px}
.rung-flags .flag{margin-top:0}
.flag.done{color:#7FCFA0;border-color:#3E8F63;background:#14261C}

/* ---------- LEVELS ---------- */
.level-done{margin-top:16px;padding:12px 14px;border-radius:9px;border:1px solid #3E8F63;background:#14261C;
  color:#CFEFDC;font-size:16px}
.btn-ghost{background:none;border:1px dashed var(--edge);color:var(--gold-lit);padding:9px 14px;border-radius:8px;
  font-family:'Outfit',sans-serif;font-size:15px;cursor:pointer}
.btn-ghost:hover{border-color:var(--gold)}
.hints{margin-top:14px;display:flex;flex-direction:column;gap:8px;align-items:flex-start}
.hint{color:var(--white);font-size:16px;line-height:1.55;padding:10px 13px;border-left:3px solid var(--gold);
  background:color-mix(in srgb,var(--gold) 8%,transparent);border-radius:0 8px 8px 0;margin:0}
.hint b{color:var(--gold);font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.1em;
  font-size:12px;margin-right:6px}
.frame{font-size:21px;line-height:2.05;color:var(--white);margin:0 0 22px;padding:18px 20px;border-radius:12px;
  background:var(--card);border:1px solid var(--edge)}
.slot{display:inline;padding:3px 9px;margin:0 2px;border-radius:7px;border:1.5px dashed var(--gold);
  color:var(--grey);font-style:italic;-webkit-box-decoration-break:clone;box-decoration-break:clone}
.slot.filled{border-style:solid;color:var(--white);font-style:normal;background:var(--card-lit)}
.slot.ok{border-color:#3E8F63;background:#14261C}
.slot.miss{border-color:#9C4B43;background:#261615}
.tile-group{border:none;padding:0;margin:0 0 18px}
.tile-group legend{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.12em;
  font-size:13px;color:var(--gold);margin-bottom:8px;padding:0}
.tiles{display:flex;flex-wrap:wrap;gap:8px}
.tile{padding:11px 15px;border-radius:9px;background:var(--card-lit);border:1px solid var(--edge);color:var(--white);
  font-family:'Outfit',sans-serif;font-size:16px;line-height:1.4;text-align:left;cursor:pointer;max-width:100%}
.tile:hover:not(:disabled){border-color:var(--gold)}
.tile.on{border-color:var(--gold);box-shadow:inset 0 0 0 1px var(--gold);background:color-mix(in srgb,var(--gold) 14%,var(--card-lit))}
.tile:disabled{cursor:default;opacity:.75}
.mc-mark.ok{color:#7FCFA0}
.mc-mark.miss{color:#E08C82}
.write-grid{display:grid;grid-template-columns:1fr 280px;gap:18px;align-items:start}
.checklist{padding:16px;border-radius:12px;background:var(--card);border:1px solid var(--edge);border-left:3px solid var(--gold)}
.tidbits{display:grid;gap:12px}
.tidbit{padding:16px 18px;border-radius:12px;background:var(--card);border:1px solid var(--edge)}
.tidbit .line-chip{margin-bottom:9px}
.tidbit p{color:var(--white);font-size:17px;line-height:1.6;margin:0 0 8px}
.source-ptr{color:var(--grey);font-size:13px;font-style:italic}
.exemplars{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.ex-badge{display:inline-block;font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.12em;
  font-size:13px;font-weight:700;padding:4px 10px;border-radius:6px;margin-bottom:9px;border:1px solid var(--edge);color:var(--grey)}
.exemplar.lv5 .ex-badge{background:var(--gold);color:var(--canvas);border-color:var(--gold)}
.techniques{display:grid;gap:10px;margin:0}
.technique{padding:14px 16px;border-radius:10px;background:var(--card);border:1px solid var(--edge)}
.technique dt{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.06em;font-size:20px;color:var(--gold-lit);margin-bottom:4px}
.technique dd{margin:0;color:var(--white);font-size:16.5px;line-height:1.55}
.enrich section{margin-bottom:10px}

/* ---------- UNIT REVIEW ---------- */
.brief{max-width:880px}
.brief-sub{color:var(--grey);font-size:15.5px;line-height:1.55;margin:-4px 0 6px}
.brief-sec{margin-bottom:6px}
.brief-p{color:var(--white);font-size:17px;line-height:1.65;margin:0 0 12px}
.brief-lead{color:var(--gold-lit);font-size:16px;font-weight:600;margin:4px 0 8px}
.brief-note{color:var(--white);font-size:16.5px;line-height:1.6;padding:12px 15px;border-left:3px solid var(--gold);
  background:color-mix(in srgb,var(--gold) 8%,transparent);border-radius:0 8px 8px 0;margin:0 0 14px}
.brief-list{color:var(--white);font-size:17px;line-height:1.6;padding-left:24px;margin:0 0 12px}
.brief-list li{margin-bottom:6px}
.anchor{padding:18px 20px;border-radius:12px;background:var(--card);border:1px solid var(--edge);margin-bottom:12px}
.anchor.primary{border-left:3px solid var(--gold)}
.anchor .card-name{margin-bottom:6px}
.anchor.bg .card-type{letter-spacing:.08em;font-size:12px;margin-bottom:8px;line-height:1.4}
.anchor-q{color:var(--white);font-size:19px;line-height:1.5;font-style:italic;margin:4px 0 8px}
.facts{min-width:0}
.facts tbody td,.facts tbody th{font-size:15.5px}
.watch{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px}
.watch li{padding:12px 15px;border-radius:10px;background:var(--card);border:1px solid var(--edge);color:var(--white);
  font-size:16.5px;line-height:1.55}
.watch .cue{font-weight:600}
.watch .arrow{color:var(--gold);margin:0 8px}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.moves{padding-left:24px;color:var(--white);font-size:17px;line-height:1.6}
.moves li{margin-bottom:14px}
.moves .starter{display:block;color:var(--grey);font-size:16px;margin-top:4px}
.moves .starter em{color:var(--gold);font-style:normal;font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;
  letter-spacing:.1em;font-size:12px;margin-right:4px}
.qc{padding-left:0;list-style:none;counter-reset:qc;display:flex;flex-direction:column;gap:12px}
.qc li{counter-increment:qc;padding:16px 18px;border-radius:12px;background:var(--card);border:1px solid var(--edge)}
.qc-q{color:var(--white);font-size:17.5px;line-height:1.5;font-weight:600;margin:0 0 10px}
.qc-q::before{content:counter(qc) ". ";color:var(--gold)}
.qc-a{color:var(--white);font-size:16.5px;line-height:1.65;margin:0;padding-top:10px;border-top:1px solid var(--edge)}

@media (prefers-reduced-motion:reduce){
  .g-needle{transition:none}
  button.gauge:hover,button.rung:hover{transform:none;box-shadow:inset 0 0 0 1px var(--gold)}
}
@media (max-width:760px){
  .write-grid,.exemplars{grid-template-columns:1fr}
  /* Key Facts stacks into cards on narrow screens and at high zoom. */
  .facts thead{position:absolute;left:-9999px}
  .facts,.facts tbody,.facts tr,.facts th,.facts td{display:block;width:100%}
  .facts tr{border:1px solid var(--edge);border-radius:10px;margin-bottom:10px;overflow:hidden}
  .facts th,.facts td{border:none;border-bottom:1px solid var(--edge)}
  .facts td::before,.facts th::before{content:attr(data-label);display:block;font-family:'Barlow Condensed',sans-serif;
    text-transform:uppercase;letter-spacing:.1em;font-size:11px;color:var(--gold);margin-bottom:2px}
}
@media (max-width:560px){
  .gauges{grid-template-columns:repeat(2,1fr);gap:10px}
  .rung{padding:13px 12px;gap:11px}
  .rung-flags{flex-direction:column}
}
`
