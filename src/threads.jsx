// ============================================================
// THE THREADS MAP — the U.S. door's fourth lane (BK, 2026-09-27 09:29: "its own lane").
// Built by Josh from Sam's signed stops file (threads-us11r.json, BK 09:56).
//
// A subway map. Each thread is a line running left to right across the units; each
// event is a stop; a stop that sits on two threads is drawn on both, joined, so a kid
// sees where two of the course's big questions meet. Thread 1 runs as a trunk and
// three strands (African Americans · Women · Native Americans); trunk stops
// (arc: null) sit on the trunk (BK ruled, 09:56).
//
// The rules this file keeps:
//   • Sam owns every word a student reads here. Nothing is rewritten; the few
//     words this file adds (lane intro, headings, "Coming") came to BK first.
//   • `source_ref` never renders. It is the gate's provenance pointer. The kid reads
//     `citation`.
//   • A stop Sam marks `building` shows, dimmed and labeled "Coming", and does not
//     open. Future units show as "Coming" columns, so the course's shape is visible.
//   • Colour never carries meaning alone: every row is labeled with its thread's
//     number and name, and every stop names its threads in words.
//   • Nothing is stored and nothing is sent. The map is a reference, not a test.
//   • Phones get one thread at a time, top to bottom. Keyboard and screen readers
//     reach every stop as a button with a spoken label.
// ============================================================
import { useEffect, useMemo, useRef, useState } from 'react'

// Line colours: light on the navy canvas (all ≥ 3:1 on #0B1220). None reuses the
// growth needle's orange or the signal red, which mean other things in the Arena.
const COLOR = {
  t1: '#C3CCDA', 't1-aa': '#5B9BD5', 't1-women': '#B08AD6', 't1-native': '#D08A5F',
  t2: '#3FB8AF', t3: '#7BC96F', t4: '#E07BB0', t5: '#CFC36A', t6: '#56C6E8', t7: '#E8A0A2',
}
const UNITS = ['11.1', '11.2', '11.3', '11.4', '11.5', '11.6', '11.7', '11.8', '11.9', '11.10']

// map-stop-shape v1 (Sam + Will 10/5, Josh confirmed 21:29; BK approved Sam's v2 23:12): a stop
// names every line it sits on in on_lines, each with its own reason and question. The 9/27 file
// (one thread, one arc) still reads, so an older copy never blanks the map.
const threadsOf = s => (s.on_lines ? [...new Set(s.on_lines.map(e => e.line))] : (Array.isArray(s.thread) ? s.thread : [s.thread]))
const arcsOf = s => (s.on_lines ? s.on_lines.filter(e => e.line === 't1' && e.sub).map(e => e.sub) : (s.arc ? [s.arc] : []))
const yearOf = s => { const m = String(s.when || '').match(/\d{4}/); return m ? +m[0] : 9999 }

// The map's rows, top to bottom. Thread 1 is a trunk plus one row per arc.
function rowsOf(data) {
  const rows = []
  for (const t of data.threads || []) {
    rows.push({ key: t.id, thread: t, arc: null, label: `${t.number} · ${t.name}` })
    for (const a of t.arcs || []) rows.push({ key: a.id, thread: t, arc: a, label: a.name, strand: true })
  }
  return rows
}
// Which rows a stop sits on: each of its threads, on the arc's strand where it has one.
function rowKeysOf(s) {
  if (s.on_lines) return [...new Set(s.on_lines.map(e => (e.line === 't1' && e.sub ? e.sub : e.line)))]
  return threadsOf(s).map(t => (t === 't1' && s.arc ? s.arc : t))
}
// The shared shape's lines become the map's threads (Thread 1's subs are its arcs).
const normalize = d => (d && d.lines && !d.threads
  ? { ...d, threads: d.lines.map(l => ({ id: l.id, number: l.number, name: l.name, question: l.question, arcs: (l.subs || []).map(x => ({ id: x.id, name: x.name, question: x.question })) })) }
  : d)

export function useThreads(ref) {
  const [data, setData] = useState(null)
  useEffect(() => {
    if (!ref) { setData(false); return }
    const r = String(ref).replace(/^content\//, '')
    fetch(`/content/${r}`).then(x => (x.ok ? x.json() : false)).then(d => setData(normalize(d))).catch(() => setData(false))
  }, [ref])
  return data
}

export function ThreadsLane({ course, maps, onOpenMap }) {
  const entry = (course.threads || [])[0]
  const data = useThreads(entry?.content_ref)
  const [open, setOpen] = useState(null)       // stop id
  const cardRef = useRef(null)
  const byId = useMemo(() => Object.fromEntries(((data && data.stops) || []).map(s => [s.id, s])), [data])
  const threadById = useMemo(() => Object.fromEntries(((data && data.threads) || []).map(t => [t.id, t])), [data])

  if (data === null) return <div className="loading">Opening the map&hellip;</div>
  if (!data) return <div className="empty"><div className="empty-title">Not open yet.</div></div>

  const pick = id => {
    const s = byId[id]
    if (!s || s.status === 'building') return
    setOpen(id)
    requestAnimationFrame(() => cardRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
  }
  const current = open && byId[open]

  return (
    <div className="threads">
      <ThreadsMap data={data} open={open} onPick={pick} />
      <ThreadsPhone data={data} open={open} onPick={pick} byId={byId} threadById={threadById} />
      <div ref={cardRef}>
        {current && <StopCard stop={current} byId={byId} threadById={threadById} onPick={pick} onClose={() => setOpen(null)}
                                mapId={current.atlas && (maps || []).some(m => m.id === current.atlas) ? current.atlas : null} onOpenMap={onOpenMap} />}
      </div>
    </div>
  )
}

// ── THE MAP (Chromebook and up) ─────────────────────────────────────────
const ROW_H = 46, SLOT = 64, UNIT_PAD = 26, FUTURE_W = 70, HEAD_H = 40, R = 9

function layout(data) {
  const stops = data.stops || []
  const rows = rowsOf(data)
  const rowIndex = Object.fromEntries(rows.map((r, i) => [r.key, i]))
  // Each unit gets one slot per stop, in the order things happened.
  const cols = []
  let x = UNIT_PAD
  const slotX = {}
  for (const u of UNITS) {
    const here = stops.filter(s => s.unit === u)
      .map((s, i) => ({ s, i })).sort((a, b) => yearOf(a.s) - yearOf(b.s) || a.i - b.i).map(o => o.s)
    const start = x
    if (here.length) {
      here.forEach((s, i) => { slotX[s.id] = x + SLOT / 2 + i * SLOT })
      x += here.length * SLOT
    } else x += FUTURE_W
    cols.push({ unit: u, x0: start, x1: x, coming: !here.length })
    x += UNIT_PAD
  }
  return { rows, rowIndex, cols, slotX, width: x, height: HEAD_H + rows.length * ROW_H + 10 }
}

function ThreadsMap({ data, open, onPick }) {
  const L = useMemo(() => layout(data), [data])
  const y = key => HEAD_H + L.rowIndex[key] * ROW_H + ROW_H / 2
  const lastLive = Math.max(...(data.stops || []).map(s => L.slotX[s.id] || 0))
  return (
    <div className="threads-map" role="group" aria-label="Threads map">
      <div className="threads-labels" aria-hidden="true">
        <div style={{ height: HEAD_H }} />
        {L.rows.map(r => (
          <div key={r.key} className={`threads-label${r.strand ? ' strand' : ''}`} style={{ height: ROW_H }}>
            <span className="swatch" style={{ background: COLOR[r.key] }} />{r.label}
          </div>
        ))}
      </div>
      <div className="threads-scroll">
        <svg width={L.width} height={L.height} viewBox={`0 0 ${L.width} ${L.height}`}>
          {/* unit columns */}
          {L.cols.map(c => (
            <g key={c.unit}>
              <rect x={c.x0 - UNIT_PAD / 2} y={4} width={c.x1 - c.x0 + UNIT_PAD} height={L.height - 8} rx={8}
                    className={c.coming ? 'col coming' : 'col'} />
              <text x={(c.x0 + c.x1) / 2} y={24} textAnchor="middle" className="col-label">{c.unit}</text>
              {c.coming && <text x={(c.x0 + c.x1) / 2} y={L.height - 14} textAnchor="middle" className="col-coming">Coming</text>}
            </g>
          ))}
          {/* the lines: solid through what's been taught, dashed on into the year */}
          {L.rows.map(r => (
            <g key={r.key} stroke={COLOR[r.key]}>
              <line x1={UNIT_PAD / 2} x2={lastLive + SLOT / 2} y1={y(r.key)} y2={y(r.key)} strokeWidth={r.strand ? 4 : 6} strokeLinecap="round" />
              <line x1={lastLive + SLOT / 2} x2={L.width - UNIT_PAD / 2} y1={y(r.key)} y2={y(r.key)} strokeWidth={r.strand ? 3 : 4} strokeDasharray="3 9" strokeLinecap="round" opacity=".5" />
            </g>
          ))}
          {/* the stops */}
          {(data.stops || []).map(s => {
            const keys = rowKeysOf(s).filter(k => k in L.rowIndex)
            const cx = L.slotX[s.id]
            const ys = keys.map(y)
            const building = s.status === 'building'
            const two = keys.length > 1
            const label = `${s.when}. ${s.title}. ${threadsOf(s).map(t => `Thread ${t.slice(1)}`).join(' and ')}${building ? '. Coming.' : ''}`
            const act = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(s.id) } }
            return (
              <g key={s.id} className={`stop${building ? ' building' : ''}${open === s.id ? ' open' : ''}`}
                 role="button" tabIndex={building ? -1 : 0} aria-label={label} aria-disabled={building || undefined}
                 onClick={() => onPick(s.id)} onKeyDown={act}>
                <title>{`${s.when} · ${s.title}`}</title>
                {two && <rect x={cx - R - 3} y={Math.min(...ys) - R - 3} width={2 * R + 6} height={Math.max(...ys) - Math.min(...ys) + 2 * R + 6}
                              rx={R + 3} className="interchange" />}
                {ys.map((yy, i) => <circle key={i} cx={cx} cy={yy} r={R} className="dot" stroke={COLOR[keys[i]]} />)}
                <text x={cx} y={Math.max(...ys) + R + 13} textAnchor="middle" className="stop-when">{building ? 'Coming' : s.when}</text>
                <rect x={cx - SLOT / 2} y={Math.min(...ys) - ROW_H / 2} width={SLOT} height={Math.max(...ys) - Math.min(...ys) + ROW_H} className="hit" />
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

// ── PHONES: one thread at a time, top to bottom ────────────────────────
function ThreadsPhone({ data, open, onPick, byId, threadById }) {
  const threads = data.threads || []
  const [tid, setTid] = useState(threads[0]?.id)
  const t = threadById[tid]
  const stops = (data.stops || []).filter(s => threadsOf(s).includes(tid))
    .map((s, i) => ({ s, i })).sort((a, b) => UNITS.indexOf(a.s.unit) - UNITS.indexOf(b.s.unit) || yearOf(a.s) - yearOf(b.s) || a.i - b.i).map(o => o.s)
  const arcName = id => (t?.arcs || []).find(a => a.id === id)?.name
  return (
    <div className="threads-phone">
      <p className="threads-pick" id="pick-thread">Pick a thread</p>
      <div className="threads-chips" role="tablist" aria-labelledby="pick-thread">
        {threads.map(th => (
          <button key={th.id} type="button" role="tab" aria-selected={th.id === tid} className={`thread-chip${th.id === tid ? ' sel' : ''}`}
                  style={{ '--c': COLOR[th.id] }} onClick={() => setTid(th.id)}>
            <b>{th.number}</b> {th.name}
          </button>
        ))}
      </div>
      {t && <p className="thread-q">{t.question}</p>}
      <ol className="thread-line" style={{ '--c': COLOR[tid] }}>
        {stops.map(s => {
          const building = s.status === 'building'
          const arc = tid === 't1' ? arcsOf(s)[0] : null
          const strand = arc ? arcName(arc) : null
          return (
            <li key={s.id} style={{ '--c': COLOR[arc || tid] }}>
              <button type="button" className={`line-stop${building ? ' building' : ''}${open === s.id ? ' open' : ''}`}
                      disabled={building} onClick={() => onPick(s.id)}>
                <span className="ls-when">{s.unit} · {s.when}</span>
                <span className="ls-title">{s.title}</span>
                {strand && <span className="ls-meta">{strand}</span>}
                {threadsOf(s).length > 1 && <span className="ls-meta">On two threads</span>}
                {building && <span className="ls-meta">Coming</span>}
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

// ── ONE STOP ─────────────────────────────────────────────────────────
function StopCard({ stop, byId, threadById, onPick, onClose, mapId, onOpenMap }) {
  const ts = threadsOf(stop).map(id => threadById[id]).filter(Boolean)
  const doc = stop.document
  const arc = arcsOf(stop)[0]
  const arcNameOf = (t, id) => (t.arcs || []).find(a => a.id === id)?.name || ''
  return (
    <article className="stop-card" aria-labelledby="stop-card-h">
      <div className="stop-card-top">
        <div className="stop-chips">
          {ts.map(t => (
            <span key={t.id} className="stop-chip" style={{ '--c': COLOR[t.id === 't1' && arc ? arc : t.id] }}>
              {t.number} · {t.name}{t.id === 't1' && arc ? ` · ${arcNameOf(t, arc)}` : ''}
            </span>
          ))}
          {ts.length > 1 && <span className="stop-chip two">On two threads</span>}
        </div>
        <button type="button" className="btn-ghost" onClick={onClose} aria-label="Close this stop">Close</button>
      </div>
      <div className="stop-when-lg">{stop.unit} · {stop.when}</div>
      <h3 id="stop-card-h" className="stop-title">{stop.title}</h3>
      <p className="stop-what">{stop.what_happened}</p>

      {/* A stop with an Atlas map (its `atlas` field names the map id) opens it (10/5). */}
      {mapId && <button type="button" className="btn-now stop-map" onClick={() => onOpenMap(mapId)}>Open the map</button>}

      {/* v2: each line the stop sits on, with Sam's reason and that line's question. */}
      {stop.on_lines ? stop.on_lines.map((e, i) => {
        const t = threadById[e.line]
        return (
          <div key={i} className="thread-entry" style={{ '--c': COLOR[e.line === 't1' && e.sub ? e.sub : e.line] }}>
            {stop.on_lines.length > 1 && t && <div className="thread-entry-name">{t.number} · {t.name}{e.sub ? ` · ${arcNameOf(t, e.sub)}` : ''}</div>}
            {e.reason && <p className="thread-entry-why">{e.reason}</p>}
            <h4 className="stop-h">The thread&rsquo;s question</h4>
            <p className="stop-q">{e.question}</p>
          </div>
        )
      }) : <>
        <h4 className="stop-h">The thread&rsquo;s question</h4>
        <p className="stop-q">{stop.question}</p>
      </>}

      {doc && <>
        <h4 className="stop-h">The document</h4>
        <div className="stop-doc">
          {doc.title && <div className="stop-doc-title">{doc.title}</div>}
          {doc.excerpt && <blockquote className="stop-excerpt">{doc.excerpt}</blockquote>}
          {doc.citation && <div className="stop-cite">{doc.citation}</div>}
        </div>
      </>}

      {(stop.also_read || []).length > 0 && <>
        <h4 className="stop-h">Also read</h4>
        {stop.also_read.map((d, i) => (
          <div key={i} className="stop-doc" style={{ marginTop: i ? 8 : 0 }}>
            {d.title && <div className="stop-doc-title">{d.title}</div>}
            {d.excerpt && <blockquote className="stop-excerpt">{d.excerpt}</blockquote>}
            {d.citation && <div className="stop-cite">{d.citation}</div>}
          </div>
        ))}
      </>}

      {(stop.links || []).length > 0 && <>
        <h4 className="stop-h">Connects to</h4>
        <ul className="stop-links">
          {stop.links.map(l => {
            const to = byId[l.to]
            if (!to) return null
            const building = to.status === 'building'
            return (
              <li key={l.to}>
                <button type="button" className="link-btn" disabled={building} onClick={() => onPick(l.to)}>
                  <span className="link-to">{to.when} · {to.title}{building ? ' · Coming' : ''}</span>
                  <span className="link-why">{l.why}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </>}
    </article>
  )
}

export const THREADS_STYLES = `
.threads{margin-top:6px}
.threads-map{display:flex;background:var(--card);border:1px solid var(--edge);border-radius:14px;box-shadow:var(--arena-lift);overflow:hidden}
.threads-labels{flex:none;width:236px;border-right:1px solid var(--edge);background:color-mix(in srgb,var(--card) 80%,var(--canvas))}
.threads-label{display:flex;align-items:center;gap:9px;padding:0 12px;color:var(--white);font-size:14px;font-weight:600;line-height:1.15}
.threads-label.strand{padding-left:30px;font-weight:500;color:var(--grey);font-size:13px}
.threads-label .swatch{flex:none;width:18px;height:6px;border-radius:3px}
.threads-scroll{overflow-x:auto;flex:1;scrollbar-color:var(--edge) transparent}
.threads-scroll svg{display:block}
.threads .col{fill:color-mix(in srgb,var(--white) 3%,transparent);stroke:var(--edge);stroke-width:1}
.threads .col.coming{fill:none;stroke-dasharray:4 6;opacity:.6}
.threads .col-label{fill:var(--gold);font-family:'Barlow Condensed',sans-serif;font-size:17px;letter-spacing:.08em}
.threads .col-coming{fill:var(--grey);font-size:11px;text-transform:uppercase;letter-spacing:.12em}
.threads .stop{cursor:pointer;outline:none}
.threads .stop .hit{fill:transparent}
.threads .stop .dot{fill:var(--canvas);stroke-width:4}
.threads .stop .interchange{fill:var(--canvas);stroke:var(--white);stroke-width:2.5}
.threads .stop .stop-when{fill:var(--grey);font-size:11px}
.threads .stop:hover .dot,.threads .stop:focus-visible .dot{fill:var(--white)}
.threads .stop:focus-visible .hit{stroke:var(--gold-lit);stroke-width:2;rx:8}
.threads .stop.open .dot{fill:var(--gold)}
.threads .stop.open .stop-when{fill:var(--gold);font-weight:700}
.threads .stop.building{cursor:default}
.threads .stop.building .dot{stroke-dasharray:3 3;opacity:.55}
.threads .stop.building .stop-when{fill:var(--dim);text-transform:uppercase;letter-spacing:.08em;font-size:10px}

.threads-phone{display:none}
@media (max-width:700px){
  .threads-map{display:none}
  .threads-phone{display:block}
}
.threads-pick{color:var(--grey);font-size:13px;text-transform:uppercase;letter-spacing:.12em;margin:0 0 8px}
.threads-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
.thread-chip{display:inline-flex;gap:6px;align-items:center;background:var(--card);color:var(--white);border:2px solid var(--c);
  border-radius:999px;padding:7px 12px;font-size:14px;cursor:pointer;text-align:left}
.thread-chip.sel{background:var(--c);color:#0B1220;font-weight:700}
.thread-q{color:var(--white);font-size:16px;line-height:1.5;margin:4px 0 14px;font-style:italic}
.thread-line{list-style:none;margin:0;padding:0 0 0 22px;position:relative}
.thread-line::before{content:'';position:absolute;left:8px;top:6px;bottom:6px;width:5px;border-radius:3px;background:var(--c)}
.thread-line li{position:relative;margin:0 0 10px}
.thread-line li::before{content:'';position:absolute;left:-20px;top:16px;width:12px;height:12px;border-radius:50%;
  background:var(--canvas);border:3px solid var(--c)}
.line-stop{width:100%;display:flex;flex-direction:column;gap:2px;align-items:flex-start;text-align:left;padding:10px 12px;
  background:var(--card);border:1px solid var(--edge);border-radius:10px;color:var(--white);cursor:pointer}
.line-stop.open{border-color:var(--gold);box-shadow:0 0 0 2px color-mix(in srgb,var(--gold) 40%,transparent)}
.line-stop.building{opacity:.6;cursor:default}
.ls-when{color:var(--gold);font-size:12.5px;letter-spacing:.06em}
.ls-title{font-size:16px;font-weight:600;line-height:1.3}
.ls-meta{color:var(--grey);font-size:12.5px;text-transform:uppercase;letter-spacing:.08em}

.stop-card{margin-top:16px;background:var(--card);border:1px solid var(--edge);border-left:4px solid var(--gold);border-radius:12px;
  padding:18px 20px;box-shadow:var(--arena-lift);max-width:860px}
.stop-card-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
.stop-chips{display:flex;flex-wrap:wrap;gap:6px}
.stop-chip{border:2px solid var(--c,var(--edge));border-radius:999px;padding:3px 10px;font-size:12.5px;color:var(--white)}
.stop-chip.two{border-style:dashed;border-color:var(--white)}
.stop-when-lg{color:var(--gold);font-size:14px;letter-spacing:.06em;margin-top:10px}
.stop-title{font-family:'Barlow Condensed',sans-serif;font-size:28px;line-height:1.05;color:var(--white);margin:2px 0 8px}
.stop-what{color:var(--white);font-size:17px;line-height:1.6;margin:0 0 12px}
.stop-h{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.1em;color:var(--gold);font-size:15px;margin:14px 0 4px}
.thread-entry{border-left:5px solid var(--c,var(--edge));padding:2px 0 2px 12px;margin-top:12px}
.thread-entry-name{color:var(--white);font-family:'Barlow Condensed',sans-serif;font-size:17px;letter-spacing:.04em}
.thread-entry-why{color:var(--white);font-size:16px;line-height:1.55;margin:4px 0 0}
.stop-q{color:var(--white);font-size:16.5px;line-height:1.55;font-style:italic;margin:0}
.stop-doc{background:color-mix(in srgb,var(--canvas) 55%,var(--card));border:1px solid var(--edge);border-radius:8px;padding:10px 12px}
.stop-doc-title{color:var(--white);font-weight:600;font-size:15.5px}
.stop-excerpt{margin:8px 0;color:var(--white);font-family:Georgia,serif;font-size:15.5px;line-height:1.55;border-left:3px solid var(--edge);padding-left:10px}
.stop-cite{color:var(--grey);font-size:13.5px;margin-top:4px}
.stop-links{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.link-btn{width:100%;text-align:left;display:flex;flex-direction:column;gap:2px;background:var(--card-lit,var(--card));
  border:1px solid var(--edge);border-radius:8px;padding:9px 12px;color:var(--white);cursor:pointer}
.link-btn:hover:not(:disabled){border-color:var(--gold)}
.link-btn:disabled{opacity:.6;cursor:default}
.link-to{font-weight:600;font-size:15px}
.link-why{color:var(--grey);font-size:14px;line-height:1.45}
`
