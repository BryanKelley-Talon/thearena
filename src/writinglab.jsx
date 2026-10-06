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
import { useEffect, useMemo, useState } from 'react'
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
}
const W = WL_WORDS

// ── what the device remembers: level numbers done, per set, nothing else ──
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
    const entries = (course?.writing_lab || []).filter(e => e.published === true)
    if (!course) { setSets(null); return }
    if (!entries.length) { setSets([]); return }
    let live = true
    Promise.all(entries.map(e => fetch(`/content/${String(e.content_ref).replace(/^content\//, '')}`)
      .then(r => (r.ok ? r.json() : null)).catch(() => null).then(data => (data ? { entry: e, data } : null))))
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
  const { entry, data } = set
  const isGlobal = !!data.multi_tag
  const [level, setLevel] = useState(null)        // null = the level picker
  const [stage, setStage] = useState('intro')
  const [result, setResult] = useState(null)      // what the sort produced, for the outline
  const [done, setDone] = useState(() => readDone()[entry.slug] || [])
  const seed = useMemo(() => Math.floor(Math.random() * 100000) + 1, [level])
  const lv = n => (data.levels || []).find(x => x.n === n) || { n, name: '' }
  const open = n => { const l = lv(n); return !l.opens_after || done.includes(l.opens_after) }
  const go = n => { setLevel(n); setStage(n === 1 ? 'intro' : 'cold'); setResult(null); window.scrollTo(0, 0) }
  const finish = r => { setResult(r); setStage('outline'); markDone(entry.slug, level); setDone(readDone()[entry.slug] || []); window.scrollTo(0, 0) }
  const toPicker = () => { setLevel(null); window.scrollTo(0, 0) }
  const backLabel = level == null ? course.label : W.card(data.name, entry.set ?? 1, data.set_title)

  return (
    <div className="wrap wl">
      <ScreenHeader label={W.card(data.name, entry.set ?? 1, data.set_title)} onBack={level == null ? onBack : toPicker} color={course.accent} back={level == null ? course.label : W.back} />

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

      {level != null && stage === 'intro' && (isGlobal ? <GlIntro data={data} onNext={() => setStage('teach')} /> : <UsIntro data={data} onNext={() => setStage('teach')} />)}
      {level != null && stage === 'teach' && (isGlobal ? <GlTeach data={data} refs={refs} onStart={() => setStage('sort')} /> : <UsTeach data={data} onStart={() => setStage('sort')} />)}
      {level != null && stage === 'cold' && (
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
      {level != null && stage === 'outline' && (isGlobal ? <GlOutline data={data} plan={result} refs={refs} /> : <UsOutline data={data} placed={result} refs={refs} />)}
      {level != null && stage === 'outline' && (
        <div className="wl-actions"><button type="button" className="btn-now" onClick={toPicker}>{W.done}</button></div>
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
function UsIntro({ data, onNext }) {
  const s = data.screens.intro
  return (
    <section className="wl-panel">
      <h2 className="wl-title">{s.title}</h2>
      <p className="wl-line">{s.line}</p>
      <ul className="wl-jobs">{data.jobs.map(j => <li key={j.id}><b>{j.label}</b> · {j.task}</li>)}</ul>
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

function UsSort({ entry, data, cold, seed, onDone }) {
  const jobs = data.jobs
  const jobBy = Object.fromEntries(jobs.map(j => [j.id, j]))
  const docs = useMemo(() => (cold ? shuffle(data.docs, seed) : data.docs), [data, cold, seed])
  const [st, setSt] = useState(() => Object.fromEntries(docs.map(d => [d.n, { pick: null, also: null, misses: 0, status: 'open', msg: null }])))
  const set = (n, patch) => setSt(s => ({ ...s, [n]: { ...s[n], ...patch } }))
  const ready = docs.every(d => st[d.n].status !== 'open' || st[d.n].pick)
  const resolved = docs.every(d => ['right', 'shown'].includes(st[d.n].status))
  const checked = docs.some(d => st[d.n].msg)
  const check = () => setSt(s => {
    const out = { ...s }
    for (const d of docs) {
      const x = s[d.n]
      if (x.status !== 'open') continue
      const ok = x.pick === d.job || (cold && ((d.also_fits || []).includes(x.pick) || x.also === d.job))
      if (ok) out[d.n] = { ...x, status: 'right', msg: { kind: 'right', text: fill(data.screens.check.right, { clue: d.clue }) } }
      else if (x.misses + 1 >= 2) out[d.n] = { ...x, misses: 2, status: 'shown', pick: d.job, msg: { kind: 'show', text: fill(data.screens.check.miss_2, { JOB: jobBy[d.job].label, clue: d.clue }) } }
      else out[d.n] = { ...x, misses: 1, pick: null, also: null, msg: { kind: 'miss', text: data.screens.check.miss_1 } }
    }
    return out
  })
  return (
    <section>
      <div className="wl-cards">
        {docs.map(d => {
          const x = st[d.n]
          const showQ = !cold || checked
          const lockd = x.status !== 'open'
          return (
            <article key={d.n} className={`wl-card${lockd ? ' locked' : ''}`} aria-label={W.doc(d.n)}>
              <h3 className="wl-doc-h">{W.doc(d.n)}</h3>
              <DocBody entry={entry} doc={d} imageFile={d.image?.file} imageAlt={d.image?.image_alt} imageSource={d.image?.source} />
              {showQ && <p className="wl-q"><Mark text={d.question} clue={x.msg && x.status !== 'open' ? d.clue : null} /></p>}
              <div className="wl-bins" role="group" aria-label={W.doc(d.n)}>
                {jobs.map(j => (
                  <button key={j.id} type="button" className="wl-bin" aria-pressed={x.pick === j.id} disabled={lockd}
                          onClick={() => set(d.n, { pick: j.id, also: x.also === j.id ? null : x.also })}>
                    <span className="atlas-check" aria-hidden="true">{x.pick === j.id ? '✓' : ''}</span>{j.label}
                  </button>
                ))}
              </div>
              {cold && !lockd && (
                <div className="wl-also">
                  <span className="wl-also-l">{data.screens.cold_read.also_fits_label}</span>
                  {jobs.filter(j => j.id !== x.pick).map(j => (
                    <button key={j.id} type="button" className="wl-bin wl-bin-sm" aria-pressed={x.also === j.id}
                            onClick={() => set(d.n, { also: x.also === j.id ? null : j.id })}>
                      <span className="atlas-check" aria-hidden="true">{x.also === j.id ? '✓' : ''}</span>{j.label}
                    </button>
                  ))}
                </div>
              )}
              {x.msg && <p className={`wl-msg ${x.msg.kind}`} role="status">{x.msg.text}</p>}
            </article>
          )
        })}
      </div>
      <div className="wl-actions">
        {!resolved
          ? <button type="button" className="btn-now" disabled={!ready} onClick={check}>{W.check}</button>
          : <button type="button" className="btn-now" onClick={() => onDone(Object.fromEntries(docs.map(d => [d.n, st[d.n].pick])))}>{W.next}</button>}
      </div>
    </section>
  )
}

function UsOutline({ data, placed, refs }) {
  const o = data.screens.outline
  const by = id => data.docs.filter(d => placed[d.n] === id).map(d => d.n)
  return (
    <section className="wl-outline">
      <div className="wl-slot teach"><b>OPENING</b> · {o.opening}</div>
      {data.jobs.map(j => (
        <div key={j.id} className="wl-slot">
          <b>{j.label}</b> · {W.docs} {by(j.id).join(', ')} · {o[j.id]}
        </div>
      ))}
      <div className="wl-slot teach"><b>CLOSING</b> · {o.closing}<RefButtons text={o.closing} refs={refs} idBase="wl-ref" /></div>
      <p className="wl-line">{o.outside_evidence}</p>
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
`
