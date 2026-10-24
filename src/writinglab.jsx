// ============================================================
// THE WRITING LAB · Tool 1 · BLUEPRINT (BK 2026-10-05: US words signed 22:25/22:29/22:46;
// Global signed 22:48, levels amended 22:54 "each level opens after the preivous is completed").
//
// One mechanic, two content feeds: Sam writes the US sets (Civic Literacy Essay), Will writes
// the Global sets (Enduring Issues Essay). What both doors share is the wiring, never the words:
//   1 cards: a document with its source line (and, US, its question)
//   2 tap to sort into named bins (US: one job per card; Global: every issue that fits)
//   3 check and coach: point first, show on the second miss
//   4 Global only: Find your three — tap an issue, the documents carrying it light up
//   5 the outline: the documents drop into the essay's slots between teaching cards
//   6 levels: Level 2 opens when Level 1 is done on that set
//
// The rules this file keeps:
//   • Every word a kid reads inside the tool comes from the desk's file, word for word. The few
//     container words (lane, buttons, level labels) went to BK first (22:57).
//   • Every document shows its source line. Tap, never drag. No score, no "X of Y": progress is dots.
//   • The device remembers only "Level 1 done" per set, to open Level 2. Nothing typed, nothing
//     picked, nothing sent. A wiped device just plays Level 1 again (Ed Law 2-d; canon §1).
// ============================================================
import { useEffect, useMemo, useRef, useState } from 'react'
import { RefButtons } from './refcards.jsx'

export const WL_WORDS = {
  lane: 'Writing Lab',
  intro: 'Tools that plan your writing before you write a word. Each set uses documents from a casefile.',
  start: 'Start', next: 'Next', check: 'Check', back: 'Back', done: 'Done',
  level: (n, name) => `Level ${n} · ${name}`,
  locked: 'Opens when Level 1 is done.',
  doc: n => `Document ${n}`,
  docs: 'Documents',
  plan: 'Plan my essay',
  card: (tool, n, title) => `${tool} · Set ${n} · ${title}`,
  // The board (US). Container words, BK 2026-10-24 13:33 ("shape: yes"); "Drop documents here." on the proof.
  empty: 'Drop documents here.',
  readIt: 'Read it',
  closeIt: 'Close',
  putIn: 'Put this document in:',
}
const W = WL_WORDS

// ── what the device remembers: level numbers done, per set, nothing else ──
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const PREVIEW = (() => { try { return new URLSearchParams(window.location.search).get('preview') === 'writing-lab' } catch { return false } })()
const KEY = 'arena-writinglab-v1'
const readDone = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} } }
const markDone = (slug, n) => {
  try { const d = readDone(); d[slug] = [...new Set([...(d[slug] || []), n])]; localStorage.setItem(KEY, JSON.stringify(d)) } catch {}
}

const imgUrl = (entry, file) => `/content/${(entry.image_map && entry.image_map[file]) || file}`
const shuffle = (arr, seed) => {
  const a = [...arr]; let s = seed
  for (let i = a.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor((s / 233280) * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  // never hand back the printed order: that's the shortcut the cold read exists to break
  return a.every((x, i) => x === arr[i]) && a.length > 1 ? [...a.slice(1), a[0]] : a
}

// ── the sets a course has, with their files ──
export function useWritingLab(course) {
  const [sets, setSets] = useState(null)
  useEffect(() => {
    // A set ships ahead and appears on its day (opens_on, the device's own date, like 11.1 Test
    // Practice): Global Tue 10/20, US Fri 10/23. A reviewer sees it early with ?preview=writing-lab.
    const entries = (course?.writing_lab || []).filter(e => e.published === true && (PREVIEW || !e.opens_on || today() >= String(e.opens_on)))
    if (!course) { setSets(null); return }
    if (!entries.length) { setSets([]); return }
    let live = true
    // `levels_ref` is optional: the level viewer (Step 3) only exists where a desk has sent the papers.
    const get = ref => fetch(`/content/${String(ref).replace(/^content\//, '')}`)
      .then(r => (r.ok ? r.json() : null)).catch(() => null)
    Promise.all(entries.map(e => Promise.all([get(e.content_ref), e.levels_ref ? get(e.levels_ref) : null])
      .then(([data, levels]) => (data ? { entry: e, data, levels } : null))))
      .then(xs => { if (live) setSets(xs.filter(Boolean)) })
    return () => { live = false }
  }, [course])
  return sets
}

export function WritingLabCards({ sets, onOpen }) {
  return (
    <div className="grid room-cards">
      {sets.map(({ entry, data }) => (
        <button key={entry.slug} type="button" className="card" onClick={() => onOpen(entry.slug)}>
          <div className="card-type">{W.lane}</div>
          <div className="card-name">{W.card(data.name, entry.set ?? 1, data.set_title)}</div>
          <span className="flag live">{W.start}</span>
        </button>
      ))}
    </div>
  )
}

export function WritingLabLane({ course, sets, unitName, onOpen, Empty }) {
  if (sets === null) return null
  if (!sets.length) return <><span className="flag building atlas-flag">Under construction</span><Empty what={W.lane} /></>
  const units = [...(course.units || [])].reverse()
  return (
    <>
      {units.map(u => {
        const here = sets.filter(s => String(s.entry.unit) === String(u.number))
        if (!here.length) return null
        return (
          <section key={u.slug} className="atlas-unit">
            <h3 className="room-section">{unitName(u)}</h3>
            <WritingLabCards sets={here} onOpen={onOpen} />
          </section>
        )
      })}
    </>
  )
}

// ============================================================
// ONE SET
// ============================================================
export function BlueprintScreen({ course, set, refs, onBack, ScreenHeader, BottomBack }) {
  const { entry, data, levels } = set
  const isGlobal = !!data.multi_tag
  // One level (US, from 2026-10-24) means no picker: a menu holding a single card is a tap for nothing.
  const single = (data.levels || []).length <= 1
  const [level, setLevel] = useState(single ? 1 : null)   // null = the level picker
  const [stage, setStage] = useState('intro')
  const [result, setResult] = useState(null)      // what the sort produced, for the outline
  const [done, setDone] = useState(() => readDone()[entry.slug] || [])
  const seed = useMemo(() => Math.floor(Math.random() * 100000) + 1, [level])
  const lv = n => (data.levels || []).find(x => x.n === n) || { n, name: '' }
  const open = n => { const l = lv(n); return !l.opens_after || done.includes(l.opens_after) }
  const go = n => { setLevel(n); setStage(n === 1 ? 'intro' : 'cold'); setResult(null); window.scrollTo(0, 0) }
  const finish = r => { setResult(r); setStage('outline'); markDone(entry.slug, level); setDone(readDone()[entry.slug] || []); window.scrollTo(0, 0) }
  const toPicker = () => { if (single) { onBack(); return } setLevel(null); window.scrollTo(0, 0) }
  const atTop = level == null || single
  const backLabel = atTop ? course.label : W.card(data.name, entry.set ?? 1, data.set_title)
  // Sam's `name` grew to "Civic Literacy Essay Blueprint" (2026-10-24), which wraps to three lines on a
  // phone in the header. The header carries the set title; the tool names itself on the intro screen.
  const headLabel = single ? data.set_title : W.card(data.name, entry.set ?? 1, data.set_title)

  return (
    <div className="wrap wl">
      <ScreenHeader label={headLabel} onBack={atTop ? onBack : toPicker} color={course.accent} back={atTop ? course.label : W.back} />

      {level == null && (
        <div className="wl-levels">
          {data.set_source && <p className="wl-source">{data.set_source}</p>}
          {(data.levels || []).map(l => {
            const ok = open(l.n)
            return (
              <button key={l.n} type="button" className={`card wl-level${ok ? '' : ' off'}`} disabled={!ok} onClick={() => ok && go(l.n)}>
                <div className="card-name">{W.level(l.n, l.name)}</div>
                {ok ? <span className="flag live">{W.start}</span> : <div className="card-blurb">{W.locked}</div>}
              </button>
            )
          })}
        </div>
      )}

      {level != null && stage === 'intro' && (isGlobal ? <GlIntro data={data} onNext={() => setStage('teach')} /> : <UsIntro data={data} showSource={single} onNext={() => setStage('teach')} />)}
      {level != null && stage === 'teach' && (isGlobal ? <GlTeach data={data} refs={refs} onStart={() => setStage('sort')} /> : <UsTeach data={data} onStart={() => setStage('sort')} />)}
      {level != null && stage === 'cold' && (isGlobal ? data.screens.cold : data.screens.cold_read) && (
        <section className="wl-panel">
          <h2 className="wl-title">{(isGlobal ? data.screens.cold : data.screens.cold_read).title}</h2>
          <p className="wl-line">{(isGlobal ? data.screens.cold : data.screens.cold_read).line}</p>
          <button type="button" className="btn-now" onClick={() => setStage('sort')}>{W.start}</button>
        </section>
      )}
      {level != null && stage === 'sort' && (isGlobal
        ? <GlName key={`${level}-${seed}`} entry={entry} data={data} cold={level > 1} seed={seed} onDone={r => { setResult(r); setStage('three'); window.scrollTo(0, 0) }} />
        : <UsSort key={`${level}-${seed}`} entry={entry} data={data} cold={level > 1} seed={seed} onDone={finish} />)}
      {level != null && stage === 'three' && <GlThree data={data} tags={result} onPlan={finish} onBack={toPicker} />}
      {level != null && stage === 'outline' && (isGlobal ? <GlOutline data={data} plan={result} refs={refs} /> : <UsOutline data={data} placed={result?.placed} marks={result?.marks} refs={refs} />)}
      {/* Step 3, where a desk has sent the papers: the next step after the outline is seeing the end goal.
          BK 2026-10-24 14:05: "the extra layer or next step after the outline is the rubric...they need to
          be abvle to see the end goal." The button's words are the levels file's own title. */}
      {level != null && stage === 'levels' && <UsLevels lv={levels} onBack={() => { setStage('outline'); window.scrollTo(0, 0) }} />}
      {level != null && stage === 'outline' && (
        <div className="wl-actions wl-after">
          {!isGlobal && levels && (levels.levels || []).length > 0 && (
            <button type="button" className="btn-now" onClick={() => { setStage('levels'); window.scrollTo(0, 0) }}>
              {(levels.screens && levels.screens.title) || W.next}
            </button>
          )}
          <button type="button" className="btn-plain" onClick={toPicker}>{W.done}</button>
        </div>
      )}

      <BottomBack onBack={level == null ? onBack : toPicker} back={backLabel} />
    </div>
  )
}

// ── a document as printed: text and/or picture, then its source line ──
function DocBody({ entry, doc, imageFile, imageAlt, imageSource }) {
  return (
    <div className="wl-doc">
      {(doc.text || []).map((p, i) => <p key={i} className="wl-doc-p">{p}</p>)}
      {imageFile && (
        <figure className="wl-fig">
          <img src={imgUrl(entry, imageFile)} alt={imageAlt || ''} loading="lazy" decoding="async" />
          {imageSource && <figcaption className="wl-cite">{imageSource}</figcaption>}
        </figure>
      )}
      {doc.source && <div className="wl-cite">{doc.source}</div>}
    </div>
  )
}

const Mark = ({ text, clue }) => {
  const i = clue ? String(text).toLowerCase().indexOf(String(clue).toLowerCase()) : -1
  if (i < 0) return <>{text}</>
  return <>{text.slice(0, i)}<mark className="wl-clue">{text.slice(i, i + clue.length)}</mark>{text.slice(i + clue.length)}</>
}
const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (_, k) => (v[k] ?? `{${k}}`))
const Dots = ({ n, at }) => (
  <ol className="atlas-dots wl-dots" aria-hidden="true">{Array.from({ length: n }, (_, i) => <li key={i} className={i === at ? 'sel' : i < at ? 'past' : ''} />)}</ol>
)

// ============================================================
// US · the Civic Literacy Essay sort
// ============================================================
function UsIntro({ data, showSource, onNext }) {
  const s = data.screens.intro
  return (
    <section className="wl-panel">
      <h2 className="wl-title">{s.title}</h2>
      <p className="wl-line">{s.line}</p>
      <ul className="wl-jobs">{data.jobs.map(j => <li key={j.id}><b>{j.label}</b> · {j.task}</li>)}</ul>
      {/* With no level picker the set's source line has nowhere else to sit, and it never goes unprinted. */}
      {showSource && data.set_source && <p className="wl-source">{data.set_source}</p>}
      <button type="button" className="btn-now" onClick={onNext}>{W.next}</button>
    </section>
  )
}
function UsTeach({ data, onStart }) {
  const s = data.screens.clue_card
  return (
    <section className="wl-panel">
      <h2 className="wl-title">{s.title}</h2>
      <p className="wl-line">{s.line}</p>
      <ul className="wl-jobs">
        {data.jobs.map(j => <li key={j.id}>{(s.clues[j.id] || []).map(c => `“${c}”`).join(', ')} → <b>{j.label}</b></li>)}
      </ul>
      <button type="button" className="btn-now" onClick={onStart}>{W.start}</button>
    </section>
  )
}

// ── the board: six document cards, three job bins, one screen ──
// The 2026-10-24 diagnosis of the old sort: 9.3 screens of scroll on a phone; the jobs and clue words
// left the screen before the work started; Check was disabled until all six were placed, so a kid got no
// feedback for the whole activity; and `also_fits` did nothing on the only level a kid reaches on Day 13,
// so a defensible answer came back "Look at the question again." The board answers all four.
// BK 2026-10-24 13:33: "1. yes" to this shape.
//
//   • Card face is the document number, its source line and its question (Sam, 10/24). The passage opens
//     on a tap, with the three job buttons inside the panel, so the decision sits beside the text.
//   • Three ways in, and every drag has a tap that does the same job: drag a card by its grip into a bin,
//     open the card and choose, or keyboard it (the grip is skipped; the card and the buttons are real
//     buttons). The grip is what drags, so a kid can still scroll the page with a finger on a card.
//   • The jobs and their clue words live on the bins and never leave the screen.
//   • A miss leaves the card where the kid put it, with the hint beside it (Sam, 10/24). The second miss
//     moves it and says why.
//   • A document in its second job is right, tagged ALSO FITS, never corrected.
//   • Nothing is counted on screen: no "X of Y", no score (canon §7). The bins are the progress.
function UsSort({ entry, data, cold, seed, onDone }) {
  const jobs = data.jobs
  const jobBy = Object.fromEntries(jobs.map(j => [j.id, j]))
  const clues = (data.screens.clue_card && data.screens.clue_card.clues) || {}
  const docs = useMemo(() => (cold ? shuffle(data.docs, seed) : data.docs), [data, cold, seed])

  const [place, setPlace] = useState({})                 // doc n -> job id
  const [st, setSt] = useState(() => Object.fromEntries(docs.map(d => [d.n, { misses: 0, status: 'open', msg: null }])))
  const [open, setOpen] = useState(null)                 // the doc whose passage is open
  const [drag, setDrag] = useState(null)                 // { n, x, y, over }
  const binRefs = useRef({})
  const press = useRef(null)

  const settled = n => st[n].status !== 'open'
  const ready = docs.every(d => place[d.n])
  const resolved = docs.every(d => settled(d.n))

  const put = (n, jobId) => { if (!settled(n)) { setPlace(p => ({ ...p, [n]: jobId })); setOpen(null) } }

  const hit = (x, y) => {
    for (const j of jobs) {
      const el = binRefs.current[j.id]
      if (!el) continue
      const r = el.getBoundingClientRect()
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return j.id
    }
    return null
  }
  const onDown = (e, n) => { if (!settled(n)) press.current = { n, x: e.clientX, y: e.clientY, id: e.pointerId, moved: false } }
  const onMove = e => {
    const p = press.current
    if (!p) return
    if (!p.moved && Math.hypot(e.clientX - p.x, e.clientY - p.y) < 8) return
    if (!p.moved) { p.moved = true; try { e.currentTarget.setPointerCapture(p.id) } catch {} }
    setDrag({ n: p.n, x: e.clientX, y: e.clientY, over: hit(e.clientX, e.clientY) })
  }
  const onUp = e => {
    const p = press.current
    press.current = null
    if (!p || !p.moved) { setDrag(null); return }
    const over = hit(e.clientX, e.clientY)
    setDrag(null)
    if (over) put(p.n, over)
  }

  // One Check for the board. A right answer, or a second job the document legitimately does, is right.
  const check = () => {
    const C = data.screens.check
    const nextSt = { ...st }, nextPlace = { ...place }
    for (const d of docs) {
      const x = st[d.n]
      if (x.status !== 'open') continue
      const pick = place[d.n]
      if (pick === d.job) {
        nextSt[d.n] = { ...x, status: 'right', msg: { kind: 'right', text: fill(C.right, { clue: d.clue }) } }
      } else if ((d.also_fits || []).includes(pick)) {
        nextSt[d.n] = { ...x, status: 'also', msg: { kind: 'also', text: C.also || fill(C.right, { clue: d.clue }) } }
      } else if (x.misses + 1 >= 2) {
        nextPlace[d.n] = d.job                           // only the second miss moves a card
        nextSt[d.n] = { ...x, misses: 2, status: 'shown', msg: { kind: 'show', text: fill(C.miss_2, { JOB: jobBy[d.job].label, clue: d.clue }) } }
      } else {
        nextSt[d.n] = { ...x, misses: 1, status: 'open', msg: { kind: 'miss', text: C.miss_1 } }
      }
    }
    setSt(nextSt); setPlace(nextPlace)
  }

  const finishUp = () => onDone({
    placed: Object.fromEntries(docs.map(d => [d.n, place[d.n]])),
    marks: Object.fromEntries(docs.map(d => [d.n, st[d.n].status])),
  })

  const tray = docs.filter(d => !place[d.n])
  const reader = open != null ? docs.find(d => d.n === open) : null

  const Chip = ({ d }) => {
    const x = st[d.n]
    return (
      <li className={`wl-chip s-${x.status}`}>
        <div className="wl-chip-row">
          {!settled(d.n) && (
            <span className="wl-grip" aria-hidden="true" onPointerDown={e => onDown(e, d.n)} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>⠿</span>
          )}
          <button type="button" className="wl-chip-b" onClick={() => setOpen(d.n)}>
            <span className="wl-chip-n">{W.doc(d.n)}</span>
            <span className="wl-chip-src">{d.source}</span>
          </button>
          {x.status === 'also' && <span className="wl-tag">{(data.screens.outline && data.screens.outline.also_fits_label) || 'ALSO FITS'}</span>}
          {x.status !== 'open' && <span className="wl-mark" aria-hidden="true">{x.status === 'shown' ? '→' : '✓'}</span>}
        </div>
        {x.msg && <p className={`wl-msg ${x.msg.kind}`} role="status">{x.msg.text}</p>}
      </li>
    )
  }

  return (
    <section className="wl-board">
      {/* the tray: documents not yet placed */}
      <ol className="wl-tray">
        {tray.map(d => (
          <li key={d.n} className={`wl-tcard${drag && drag.n === d.n ? ' lifting' : ''}`}>
            <span className="wl-grip" aria-hidden="true" onPointerDown={e => onDown(e, d.n)} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>⠿</span>
            <button type="button" className="wl-tcard-b" onClick={() => setOpen(d.n)} aria-label={`${W.doc(d.n)} — ${W.readIt}`}>
              <span className="wl-chip-n">{W.doc(d.n)}</span>
              <span className="wl-chip-src">{d.source}</span>
              <span className="wl-tcard-q">{d.question}</span>
              <span className="wl-read">{W.readIt}</span>
            </button>
          </li>
        ))}
        {!tray.length && <li className="wl-tray-done" />}
      </ol>

      {/* the bins: the jobs and their clue words, always on screen */}
      <div className="wl-binsrow">
        {jobs.map(j => {
          const here = docs.filter(d => place[d.n] === j.id)
          return (
            <section key={j.id} ref={el => { binRefs.current[j.id] = el }}
                     className={`wl-binbox${drag && drag.over === j.id ? ' over' : ''}`}>
              <h3 className="wl-bin-h">{j.label}</h3>
              <p className="wl-bin-clue">{(clues[j.id] || []).map(c => `“${c}”`).join(' · ')}</p>
              <ul className="wl-chips">{here.map(d => <Chip key={d.n} d={d} />)}</ul>
              {!here.length && <p className="wl-bin-empty">{W.empty}</p>}
            </section>
          )
        })}
      </div>

      {/* the passage, and the decision beside it */}
      {reader && (
        <div className="wl-reader" role="dialog" aria-modal="true" aria-label={W.doc(reader.n)}>
          <div className="wl-reader-in">
            <h3 className="wl-doc-h">{W.doc(reader.n)}</h3>
            <DocBody entry={entry} doc={reader} imageFile={reader.image?.file} imageAlt={reader.image?.image_alt} imageSource={reader.image?.source} />
            <p className="wl-q"><Mark text={reader.question} clue={settled(reader.n) ? reader.clue : null} /></p>
            {!settled(reader.n) && (
              <>
                <p className="wl-put">{W.putIn}</p>
                <div className="wl-bins" role="group" aria-label={W.putIn}>
                  {jobs.map(j => (
                    <button key={j.id} type="button" className="wl-bin" aria-pressed={place[reader.n] === j.id} onClick={() => put(reader.n, j.id)}>
                      <span className="atlas-check" aria-hidden="true">{place[reader.n] === j.id ? '✓' : ''}</span>{j.label}
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="wl-actions"><button type="button" className="btn-now" onClick={() => setOpen(null)}>{W.closeIt}</button></div>
          </div>
        </div>
      )}

      {/* what the finger is carrying */}
      {drag && <div className="wl-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden="true">{W.doc(drag.n)}</div>}

      <div className="wl-actions">
        {!resolved
          ? <button type="button" className="btn-now" disabled={!ready} onClick={check}>{W.check}</button>
          : <button type="button" className="btn-now" onClick={finishUp}>{W.next}</button>}
      </div>
    </section>
  )
}

// ── the finished blueprint: the board, turned into the plan of their essay ──
// The old screen printed five generic lines and a list of bare numbers, and because a second miss
// overwrote the kid's pick it always showed the corrected sort. This one holds the cards they placed,
// in Sam's order, with an empty "what it shows" line under each — the shape of what they write on
// pages 19–20. Nothing is stored and nothing is typed into (canon §1, §8).
function UsOutline({ data, placed, marks, refs }) {
  const o = data.screens.outline
  const inJob = id => data.docs.filter(d => placed[d.n] === id)
  return (
    <section className="wl-outline">
      {o.title && <h2 className="wl-title">{o.title}</h2>}
      {o.line && <p className="wl-line">{o.line}</p>}
      <div className="wl-slot teach"><b>OPENING</b> · {o.opening}</div>
      {data.jobs.map(j => (
        <div key={j.id} className="wl-slot">
          <div className="wl-bp-head"><b>{j.label}</b>{o[j.id] ? <> · {o[j.id]}</> : null}</div>
          <ul className="wl-bp-docs">
            {inJob(j.id).map(d => (
              <li key={d.n} className="wl-bp-doc">
                <div className="wl-bp-doc-h">
                  <span className="wl-chip-n">{W.doc(d.n)}</span>
                  {marks && marks[d.n] === 'also' && o.also_fits_label && <span className="wl-tag">{o.also_fits_label}</span>}
                </div>
                {d.source && <div className="wl-cite">{d.source}</div>}
                {o.what_it_shows && <div className="wl-bp-blank">{o.what_it_shows}</div>}
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className="wl-slot teach"><b>CLOSING</b> · {o.closing}<RefButtons text={o.closing} refs={refs} idBase="wl-ref" /></div>
      <p className="wl-line">{o.outside_evidence}</p>
      {o.last_line && <p className="wl-last">{o.last_line}</p>}
    </section>
  )
}

// ── Step 3: what each level looks like ──
// Five real anchor papers from the June 2026 CLE Rating Guide, with the state's own rater commentary.
// BK 2026-10-24: "we're not scoring kids on arena per the rule..we are showing them what scores look
// like." So nothing here grades anybody and nothing is stored — a kid reads a paper and, when they
// want it, why it scored there. The level buttons stay on screen so a 2 can be read beside a 4.
// Every word is Sam's file, word for word; the only interaction choice is that the commentary starts
// folded, so a kid can form their own view of a paper before the state tells them. Flagged to BK.
function UsLevels({ lv, onBack }) {
  const s = lv.screens || {}
  const [pick, setPick] = useState(null)
  const [why, setWhy] = useState(false)
  const cur = pick != null ? (lv.levels || []).find(l => l.n === pick) : null
  const choose = n => { setPick(n); setWhy(false); window.scrollTo(0, 0) }
  return (
    <section className="wl-levelview">
      {s.title && <h2 className="wl-title">{s.title}</h2>}
      {s.line && <p className="wl-line">{s.line}</p>}
      {s.pick && <p className="wl-put">{s.pick}</p>}
      <div className="wl-bins" role="group" aria-label={s.pick || s.title}>
        {(lv.levels || []).map(l => (
          <button key={l.n} type="button" className="wl-bin" aria-pressed={pick === l.n} onClick={() => choose(l.n)}>
            <span className="atlas-check" aria-hidden="true">{pick === l.n ? '✓' : ''}</span>{l.label}
          </button>
        ))}
      </div>
      {cur && (
        <article className="wl-paper" aria-label={cur.label}>
          <h3 className="wl-doc-h">{cur.label}</h3>
          <div className="wl-doc">
            {(cur.paper || []).map((p, i) => <p key={i} className="wl-doc-p">{p}</p>)}
          </div>
          {cur.source && <div className="wl-cite">{cur.source}</div>}
          {(cur.why || []).length > 0 && s.why_head && (
            <div className="wl-why">
              <button type="button" className="wl-why-b" aria-expanded={why} onClick={() => setWhy(w => !w)}>
                <span className="wl-why-sign" aria-hidden="true">{why ? '−' : '+'}</span>{s.why_head}
              </button>
              {why && <ul className="wl-why-list">{cur.why.map((w, i) => <li key={i}>{w}</li>)}</ul>}
            </div>
          )}
        </article>
      )}
      <div className="wl-actions"><button type="button" className="btn-now" onClick={onBack}>{W.back}</button></div>
    </section>
  )
}

// ============================================================
// GLOBAL · the Enduring Issues Essay: name every issue, find your three
// ============================================================
function GlIntro({ data, onNext }) {
  const s = data.screens.intro
  return (
    <section className="wl-panel">
      <h2 className="wl-title">{s.title}</h2>
      <p className="wl-line">{s.line}</p>
      <ul className="wl-jobs">{data.task.map(t => <li key={t.label}><b>{t.label}</b> · {t.line}</li>)}</ul>
      <div className="wl-def"><b>{data.definition.label}</b> {data.definition.line}</div>
      <button type="button" className="btn-now" onClick={onNext}>{W.next}</button>
    </section>
  )
}
function GlTeach({ data, refs, onStart }) {
  const s = data.screens.margin_card
  return (
    <section className="wl-panel">
      <h2 className="wl-title">{s.title}</h2>
      {s.lines.map((l, i) => <p key={i} className="wl-line">{l}</p>)}
      <RefButtons text={s.lines.join(' ')} refs={refs} idBase="wl-ref" />
      <button type="button" className="btn-now" onClick={onStart}>{W.start}</button>
    </section>
  )
}

const umbrellaOf = (data, issue) => (data.bins.find(b => b.issues.some(i => i.name === issue)) || {}).umbrella

function GlName({ entry, data, cold, seed, onDone }) {
  const docs = useMemo(() => (cold ? shuffle(data.docs, seed) : data.docs), [data, cold, seed])
  const [i, setI] = useState(0)
  const [st, setSt] = useState(() => Object.fromEntries(docs.map(d => [d.n, { picks: [], kept: [], tries: 0, msgs: [], done: false }])))
  const d = docs[i], x = st[d.n]
  const must = d.must_find.map(m => m.issue), fair = d.also_fair || []
  const toggle = name => setSt(s => {
    const y = s[d.n]; if (y.done || y.kept.includes(name)) return s
    return { ...s, [d.n]: { ...y, picks: y.picks.includes(name) ? y.picks.filter(p => p !== name) : [...y.picks, name] } }
  })
  const check = () => setSt(s => {
    const y = s[d.n]; const tries = y.tries + 1; const C = data.screens.check
    const kept = [...y.kept], msgs = []
    let picks = [...y.picks]
    for (const p of y.picks) {
      if (kept.includes(p)) continue
      const m = d.must_find.find(z => z.issue === p)
      if (m) { kept.push(p); msgs.push({ kind: 'right', text: fill(C.right, { n: d.n, issue: p }), reason: m.reason }) }
      else if (fair.includes(p)) kept.push(p)
      else { msgs.push({ kind: 'miss', text: fill(C.wrong, { n: d.n, issue: p }) }); if (tries >= 2) picks = picks.filter(q => q !== p) }
    }
    const missing = must.filter(m => !kept.includes(m))
    if (missing.length && tries < 2) {
      for (const u of [...new Set(missing.map(m => umbrellaOf(data, m)))]) msgs.push({ kind: 'miss', text: fill(C.missed, { umbrella: u }) })
    } else for (const m of missing) {
      kept.push(m); picks.push(m)
      msgs.push({ kind: 'show', text: fill(C.show, { n: d.n, issue: m }), reason: d.must_find.find(z => z.issue === m).reason })
    }
    const done = must.every(m => kept.includes(m))
    return { ...s, [d.n]: { picks, kept, tries, msgs, done } }
  })
  const next = () => {
    if (i < docs.length - 1) { setI(i + 1); window.scrollTo(0, 0); return }
    onDone(Object.fromEntries(docs.map(z => [z.n, st[z.n].kept])))
  }
  return (
    <section>
      <Dots n={docs.length} at={i} />
      <article className="wl-card" aria-label={W.doc(d.n)}>
        <h3 className="wl-doc-h">{W.doc(d.n)}{d.title ? ` · ${d.title}` : ''}</h3>
        <DocBody entry={entry} doc={d} imageFile={d.image} imageAlt={d.image_alt} />
        <div className="wl-umbrellas">
          {data.bins.map(b => (
            <fieldset key={b.umbrella} className="wl-umb">
              <legend>{b.umbrella}</legend>
              <div className="wl-issues">
                {b.issues.map(iss => {
                  const on = x.picks.includes(iss.name) || x.kept.includes(iss.name)
                  const ok = x.kept.includes(iss.name)
                  return (
                    <button key={iss.name} type="button" className={`wl-bin wl-issue${ok ? ' ok' : ''}`} aria-pressed={on} disabled={x.done}
                            onClick={() => toggle(iss.name)}>
                      <span className="atlas-check" aria-hidden="true">{on ? '✓' : ''}</span>
                      <span><span className="wl-issue-n">{iss.name}</span>{!cold && <span className="wl-issue-d">{iss.definition}</span>}</span>
                    </button>
                  )
                })}
              </div>
            </fieldset>
          ))}
        </div>
        {x.msgs.length > 0 && (
          <ul className="wl-msgs" role="status">
            {x.msgs.map((m, k) => <li key={k} className={`wl-msg ${m.kind}`}>{m.text}{m.reason ? <span className="wl-reason"> {m.reason}</span> : null}</li>)}
          </ul>
        )}
      </article>
      <div className="wl-actions">
        {!x.done
          ? <button type="button" className="btn-now" disabled={!x.picks.length && !x.kept.length} onClick={check}>{W.check}</button>
          : <button type="button" className="btn-now" onClick={next}>{W.next}</button>}
      </div>
    </section>
  )
}

function GlThree({ data, tags, onPlan, onBack }) {
  const s = data.screens.find_three
  const docsOrder = data.docs.map(d => d.n)
  const carry = name => docsOrder.filter(n => (tags[n] || []).includes(name))
  const reach = data.bins.flatMap(b => b.issues.map(i => i.name)).filter(n => carry(n).length >= 3)
  const [issue, setIssue] = useState(null)
  const [chosen, setChosen] = useState([])
  const lit = issue ? carry(issue) : []
  const pickIssue = n => { setIssue(n); setChosen(carry(n).length === 3 ? carry(n) : []) }
  const toggle = n => setChosen(c => c.includes(n) ? c.filter(x => x !== n) : c.length < 3 ? [...c, n] : c)
  return (
    <section className="wl-panel">
      <h2 className="wl-title">{s.title}</h2>
      <p className="wl-line">{s.line}</p>
      {reach.length === 0 && <p className="wl-msg miss">{s.no_match}</p>}
      {reach.length > 1 && <p className="wl-msg">{s.multi_match}</p>}
      <div className="wl-umbrellas">
        {data.bins.map(b => (
          <fieldset key={b.umbrella} className="wl-umb">
            <legend>{b.umbrella}</legend>
            <div className="wl-issues">
              {b.issues.map(iss => (
                <button key={iss.name} type="button" className="wl-bin" aria-pressed={issue === iss.name} onClick={() => pickIssue(iss.name)}>
                  <span className="atlas-check" aria-hidden="true">{issue === iss.name ? '✓' : ''}</span>{iss.name}
                </button>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <div className="wl-tiles">
        {docsOrder.map(n => {
          const on = lit.includes(n)
          return (
            <button key={n} type="button" className={`wl-tile${on ? ' lit' : ''}`} disabled={!on} aria-pressed={chosen.includes(n)} onClick={() => toggle(n)}>
              <span className="atlas-check" aria-hidden="true">{chosen.includes(n) ? '✓' : ''}</span>{W.doc(n)}
            </button>
          )
        })}
      </div>
      <div className="wl-actions">
        {reach.length === 0
          ? <button type="button" className="btn-now" onClick={onBack}>{W.back}</button>
          : <button type="button" className="btn-now" disabled={chosen.length !== 3} onClick={() => onPlan({ issue, docs: chosen })}>{W.plan}</button>}
      </div>
    </section>
  )
}

function GlOutline({ data, plan, refs }) {
  return (
    <section className="wl-outline">
      {data.screens.outline.map(o => (
        <div key={o.label} className={`wl-slot${['OPENING', 'CLOSING'].includes(o.label) ? ' teach' : ''}`}>
          <b>{o.label}</b>
          {o.label === 'IDENTIFY AND EXPLAIN' && plan?.issue ? <> · <span className="wl-pick">{plan.issue}</span></> : null}
          {o.label === 'EVIDENCE' && plan?.docs ? <> · {W.docs} {[...plan.docs].sort((a, b) => Number(a) - Number(b)).join(', ')}</> : null}
          {' · '}{o.card}
        </div>
      ))}
    </section>
  )
}

export const WRITINGLAB_STYLES = `
/* ---------- THE WRITING LAB ---------- */
.wl .card.wl-level{max-width:520px;margin-bottom:12px}
.wl-levels{display:grid;gap:12px;margin-top:6px}
.wl-source{color:var(--grey);font-size:15px;margin:0 0 6px}
.wl-panel{background:var(--card);border:1px solid var(--edge);border-radius:12px;padding:20px;box-shadow:var(--arena-lift);max-width:860px;display:flex;flex-direction:column;gap:12px;align-items:flex-start}
.wl-title{font-family:'Barlow Condensed',sans-serif;font-size:30px;line-height:1.05;color:var(--white);margin:0;letter-spacing:.02em}
.wl-line{color:var(--white);font-size:17px;line-height:1.6;margin:0}
.wl-jobs{margin:0;padding-left:20px;color:var(--white);font-size:16.5px;line-height:1.55;display:grid;gap:6px}
.wl-jobs b{color:var(--gold-lit);letter-spacing:.04em}
.wl-def{border-left:4px solid var(--gold);padding:8px 12px;background:color-mix(in srgb,var(--canvas) 45%,var(--card));color:var(--white);font-size:16px;line-height:1.55}
.wl-def b{color:var(--gold-lit);display:block;font-family:'Barlow Condensed',sans-serif;letter-spacing:.08em}
.wl-cards{display:grid;gap:16px}
.wl-card{background:var(--card);border:1px solid var(--edge);border-radius:12px;padding:16px 18px;box-shadow:var(--arena-lift);max-width:900px}
.wl-card.locked{border-color:var(--gold)}
.wl-doc-h{font-family:'Barlow Condensed',sans-serif;color:var(--gold);font-size:20px;letter-spacing:.06em;margin:0 0 8px;text-transform:uppercase}
.wl-doc{background:color-mix(in srgb,var(--canvas) 55%,var(--card));border:1px solid var(--edge);border-radius:8px;padding:12px 14px}
.wl-doc-p{color:var(--white);font-family:Georgia,serif;font-size:16.5px;line-height:1.6;margin:0 0 8px}
.wl-fig{margin:8px 0}
.wl-fig img{max-width:100%;height:auto;display:block;border-radius:6px;background:#fff}
.wl-cite{color:#B7C3D6;font-size:13.5px;line-height:1.45;margin-top:6px;overflow-wrap:anywhere}
.wl-q{color:var(--white);font-size:16.5px;line-height:1.55;font-weight:600;margin:12px 0 4px}
.wl-clue{background:#FFE34A;color:#0B1220;padding:0 3px;border-radius:3px}
.wl-bins,.wl-issues{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.wl-bin{min-height:44px;padding:8px 14px;border-radius:10px;background:var(--arena-choice);border:1.5px solid var(--arena-choice-edge);color:var(--white);
  font:inherit;font-size:15.5px;letter-spacing:.03em;cursor:pointer;display:inline-flex;align-items:center;gap:8px;text-align:left}
.wl-bin:hover:not(:disabled){border-color:var(--gold)}
.wl-bin[aria-pressed=true]{background:#33496F;border-color:var(--gold)}
.wl-bin[aria-pressed=true] .atlas-check{background:var(--gold);border-color:var(--gold)}
.wl-bin:disabled{cursor:default}
.wl-bin.ok{border-color:#3FB37A}
.wl-bin-sm{min-height:38px;padding:5px 10px;font-size:14px}
.wl-also{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:8px}
.wl-also-l{color:var(--gold);font-family:'Barlow Condensed',sans-serif;letter-spacing:.1em;font-size:14px}
.wl-msg{margin:10px 0 0;padding:8px 12px;border-radius:8px;border:1px solid var(--edge);color:var(--white);font-size:16px;line-height:1.5;background:color-mix(in srgb,var(--canvas) 40%,var(--card))}
.wl-msg.right{border-left:6px solid #3FB37A}
.wl-msg.miss{border-left:6px solid var(--gold)}
.wl-msg.show{border-left:6px solid #6FA8FF}
.wl-msgs{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:6px}
.wl-msgs .wl-msg{margin:0}
.wl-reason{color:#C9D3E3}
.wl-actions{margin:16px 0}
.wl-umbrellas{display:grid;gap:10px;margin-top:12px}
.wl-umb{border:none;margin:0;padding:0}
.wl-umb legend{font-family:'Barlow Condensed',sans-serif;color:var(--gold);letter-spacing:.1em;font-size:14.5px;padding:0}
.wl-issue{flex:1 1 260px;align-items:flex-start}
.wl-bin .atlas-check,.wl-tile .atlas-check{flex:none}
.wl-issue-n{display:block;font-weight:600}
.wl-issue-d{display:block;color:#C9D3E3;font-size:13.5px;line-height:1.4;letter-spacing:0;margin-top:2px}
.wl-tiles{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.wl-tile{min-height:48px;padding:8px 14px;border-radius:10px;background:transparent;border:1.5px dashed var(--edge);color:var(--grey);font:inherit;font-size:15.5px;display:inline-flex;align-items:center;gap:8px;cursor:default}
.wl-tile.lit{background:var(--arena-choice);border:2px solid var(--gold);color:var(--white);cursor:pointer;box-shadow:0 0 0 3px color-mix(in srgb,var(--gold) 30%,transparent)}
.wl-tile[aria-pressed=true]{background:#33496F}
.wl-tile[aria-pressed=true] .atlas-check{background:var(--gold);border-color:var(--gold)}
.wl-dots{margin:0 0 10px}
.wl-outline{display:grid;gap:10px;max-width:860px}
.wl-slot{background:var(--card);border:1px solid var(--edge);border-left:6px solid var(--gold);border-radius:10px;padding:12px 14px;color:var(--white);font-size:16.5px;line-height:1.55}
.wl-slot.teach{border-left-color:var(--edge);background:color-mix(in srgb,var(--canvas) 45%,var(--card))}
.wl-slot b{color:var(--gold-lit);letter-spacing:.05em}
.wl-pick{background:#FFE34A;color:#0B1220;padding:0 4px;border-radius:3px;font-weight:700}
@media (prefers-reduced-motion: reduce){ .wl-tile{transition:none} }

/* ---------- THE BOARD (US, 2026-10-24) ---------- */
.wl-board{display:grid;gap:18px;max-width:1040px}
.wl-tray{list-style:none;margin:0;padding:0;display:grid;gap:10px;grid-template-columns:repeat(auto-fill,minmax(258px,1fr))}
.wl-tray-done{display:none}
.wl-tcard{display:flex;align-items:stretch;gap:0;background:var(--card);border:1.5px solid var(--edge);border-radius:10px;box-shadow:var(--arena-lift);overflow:hidden}
.wl-tcard.lifting{opacity:.45;border-style:dashed}
.wl-grip{flex:none;width:44px;min-width:44px;min-height:44px;display:flex;align-items:center;justify-content:center;cursor:grab;
  color:var(--gold-lit);font-size:23px;line-height:1;background:color-mix(in srgb,var(--gold) 14%,var(--card));
  border-right:1.5px solid var(--arena-choice-edge);touch-action:none;user-select:none}
.wl-grip:hover{background:color-mix(in srgb,var(--gold) 26%,var(--card))}
.wl-grip:active{cursor:grabbing}
/* A disabled Check must not look like a live one: the Feel Floor forbids dead taps, and the Arena has
   no disabled rule for btn-now of its own (finding, 2026-10-24 - scoped here for Monday, raised for a
   separate push). Dimmed and cursor-blocked, so the state reads without relying on colour alone. */
.wl .btn-now:disabled{opacity:.42;cursor:not-allowed;filter:grayscale(.55)}
.wl-tcard-b{flex:1;min-height:44px;display:flex;flex-direction:column;align-items:flex-start;gap:3px;
  padding:10px 12px;background:transparent;border:0;color:var(--white);font:inherit;text-align:left;cursor:pointer}
.wl-tcard-b:hover,.wl-tcard-b:focus-visible{background:color-mix(in srgb,var(--gold) 10%,transparent)}
.wl-chip-n{font-family:'Barlow Condensed',sans-serif;color:var(--gold);font-size:17px;letter-spacing:.06em;text-transform:uppercase}
.wl-chip-src{color:#B7C3D6;font-size:12.5px;line-height:1.35;overflow-wrap:anywhere}
.wl-tcard-q{color:var(--white);font-size:14.5px;line-height:1.4;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.wl-read{color:var(--gold-lit);font-size:13px;letter-spacing:.06em;text-transform:uppercase;font-family:'Barlow Condensed',sans-serif}

.wl-binsrow{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));align-items:start}
.wl-binbox{background:color-mix(in srgb,var(--canvas) 55%,var(--card));border:2px dashed var(--arena-choice-edge);
  border-radius:12px;padding:12px 13px;min-height:132px}
.wl-binbox.over{border-style:solid;border-color:var(--gold);background:color-mix(in srgb,var(--gold) 12%,var(--card));box-shadow:0 0 0 3px color-mix(in srgb,var(--gold) 35%,transparent)}
.wl-bin-h{font-family:'Barlow Condensed',sans-serif;color:var(--gold);font-size:19px;letter-spacing:.07em;margin:0 0 2px}
.wl-bin-clue{color:#C9D3E3;font-size:13px;line-height:1.4;margin:0 0 9px}
.wl-bin-empty{color:var(--grey);font-size:14px;margin:0;font-style:italic}
.wl-chips{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.wl-chip{background:var(--card);border:1.5px solid var(--arena-choice-edge);border-left-width:6px;border-radius:9px;padding:8px 10px}
.wl-chip.s-right,.wl-chip.s-also{border-left-color:#3FB37A}
.wl-chip.s-shown{border-left-color:#6FA8FF}
.wl-chip-row{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.wl-chip-b{flex:1 1 150px;min-height:40px;display:flex;flex-direction:column;align-items:flex-start;gap:2px;
  background:transparent;border:0;color:var(--white);font:inherit;text-align:left;cursor:pointer;padding:2px 0}
.wl-chip-b:hover .wl-chip-n,.wl-chip-b:focus-visible .wl-chip-n{text-decoration:underline}
.wl-mark{flex:none;color:#8FE0B8;font-size:17px;line-height:1}
.wl-chip.s-shown .wl-mark{color:#9CC6FF}
.wl-tag{flex:none;background:var(--gold);color:#0B1220;font-family:'Barlow Condensed',sans-serif;font-size:12px;
  letter-spacing:.09em;padding:2px 7px;border-radius:4px;font-weight:700}
.wl-msg.also{border-left:6px solid #3FB37A}

.wl-reader{position:fixed;inset:0;z-index:60;background:color-mix(in srgb,#000 68%,transparent);
  overflow-y:auto;padding:18px 14px;display:flex;justify-content:center;align-items:flex-start}
.wl-reader-in{background:var(--card);border:1px solid var(--edge);border-radius:12px;padding:18px;
  box-shadow:var(--arena-lift);max-width:720px;width:100%}
.wl-put{color:var(--gold-lit);font-family:'Barlow Condensed',sans-serif;letter-spacing:.07em;font-size:16px;margin:14px 0 0}
.wl-ghost{position:fixed;z-index:80;transform:translate(-50%,-50%);pointer-events:none;
  background:var(--gold);color:#0B1220;font-family:'Barlow Condensed',sans-serif;font-size:16px;letter-spacing:.06em;
  text-transform:uppercase;padding:7px 13px;border-radius:8px;box-shadow:0 6px 18px rgba(0,0,0,.45)}

/* ---------- THE FINISHED BLUEPRINT ---------- */
/* BK 2026-10-24 14:37: "i think we need a visual aesthetic related to writing...lined paper, something
   that sets it apart a bit as a thing...blueprint type stuff around that?" Drawn in CSS, not an image:
   nothing to download on school wifi, scales at any width, and it reverts in one commit. The plan is
   drafting paper; the anchor papers are a real ruled sheet. */
.wl-outline{position:relative;padding:22px 18px;border-radius:12px;
  border:1.5px solid color-mix(in srgb,#7FB0E0 42%,transparent);
  background-color:#0A1526;
  background-image:
    linear-gradient(color-mix(in srgb,#7FB0E0 10%,transparent) 1px,transparent 1px),
    linear-gradient(90deg,color-mix(in srgb,#7FB0E0 10%,transparent) 1px,transparent 1px);
  background-size:26px 26px,26px 26px}
.wl-outline::before{content:'';position:absolute;inset:8px;border:1px dashed color-mix(in srgb,#7FB0E0 32%,transparent);
  border-radius:8px;pointer-events:none;z-index:0}
.wl-outline > *{position:relative;z-index:1}
.wl-bp-head{margin-bottom:6px}
.wl-bp-docs{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.wl-bp-doc{background:color-mix(in srgb,var(--canvas) 50%,var(--card));border:1px solid var(--edge);border-radius:8px;padding:9px 11px}
.wl-bp-doc-h{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.wl-bp-blank{margin-top:7px;padding-bottom:5px;border-bottom:1.5px dashed var(--arena-choice-edge);color:var(--grey);font-size:13.5px;font-style:italic}
.wl-last{color:var(--gold-lit);font-size:16.5px;line-height:1.5;margin:4px 0 0}

/* ---------- STEP 3 · WHAT EACH LEVEL LOOKS LIKE ---------- */
.wl-levelview{display:grid;gap:12px;max-width:900px;justify-items:start}
.wl-levelview .wl-bins{margin-top:2px}
.wl-after{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.btn-plain{min-height:44px;padding:10px 16px;border-radius:9px;background:transparent;border:1.5px solid var(--arena-choice-edge);
  color:var(--white);font:inherit;font-size:15.5px;letter-spacing:.03em;cursor:pointer}
.btn-plain:hover{border-color:var(--gold)}
.wl-paper{background:var(--card);border:1px solid var(--edge);border-radius:12px;padding:16px 18px;box-shadow:var(--arena-lift);max-width:900px;width:100%}
/* A real paper, so it looks like one: a warm ruled sheet with a margin line, ink on cream. The rule
   spacing and the line-height are the same 28px, so the writing sits ON the lines. Scoped to .wl-paper —
   the document cards and the reader keep the Arena's dark treatment. Ink #1E2430 on #F6F2E7 is ~13:1. */
.wl-paper .wl-doc{position:relative;background-color:#F6F2E7;border:1px solid #CFC6AF;border-radius:4px;
  padding:16px 20px 18px 58px;box-shadow:0 2px 10px rgba(0,0,0,.35);
  background-image:repeating-linear-gradient(to bottom,transparent 0 27px,color-mix(in srgb,#2C4A7A 20%,transparent) 27px 28px);
  background-position:0 15px}
.wl-paper .wl-doc::before{content:'';position:absolute;top:0;bottom:0;left:42px;width:1.5px;
  background:color-mix(in srgb,#B3261E 40%,transparent)}
.wl-paper .wl-doc-p{position:relative;color:#1E2430;font-size:16.5px;line-height:28px;margin:0 0 28px}
.wl-paper .wl-doc-p:last-child{margin-bottom:0}
.wl-why{margin-top:12px}
.wl-why-b{min-height:44px;display:inline-flex;align-items:center;gap:9px;padding:8px 14px;border-radius:10px;
  background:var(--arena-choice);border:1.5px solid var(--arena-choice-edge);color:var(--white);font:inherit;
  font-family:'Barlow Condensed',sans-serif;font-size:17px;letter-spacing:.05em;cursor:pointer;text-align:left}
.wl-why-b:hover{border-color:var(--gold)}
.wl-why-b[aria-expanded=true]{border-color:var(--gold);background:#33496F}
.wl-why-sign{flex:none;width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;
  background:var(--gold);color:#0B1220;border-radius:5px;font-size:16px;line-height:1;font-weight:700}
.wl-why-list{list-style:none;margin:12px 0 0;padding:0;display:grid;gap:8px}
.wl-why-list li{color:var(--white);font-size:16px;line-height:1.5;padding:8px 12px;border-radius:8px;
  border-left:4px solid var(--gold);background:color-mix(in srgb,var(--canvas) 45%,var(--card))}

@media (max-width:560px){
  .wl-tray{grid-template-columns:1fr}
  .wl-tcard-q{-webkit-line-clamp:2}
  .wl-reader{padding:10px 8px}
}
@media (prefers-reduced-motion: reduce){ .wl-tcard,.wl-binbox,.wl-ghost{transition:none} }
`
