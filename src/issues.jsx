// ============================================================
// THE ENDURING ISSUES MAP — Global's door (Leo's ruling 10/5 20:59: map first, then Case Builder,
// then the essay builder in the Writing Lab; BK 21:38: "EI Map moves above case closed...for now").
// Will's signed stops (BK 21:14, "yes agreed to all"), on map-stop-shape v1 (Sam + Will, Josh
// confirmed 21:29). This engine reads the shared shape, so Sam's Threads map can move onto it
// once his re-tagged stops are signed.
//
// A transit map (BK's Paladin idea). Each line is one of the Six Umbrellas, named as the card
// prints it; each stop is an event from the casefiles; an event sits on every line it belongs to;
// "You are here" is the unit we're in.
//
// The rules this file keeps:
//   • Will owns every word a student reads here. Nothing is rewritten. The few words this file
//     adds (lane name and intro, the card headings, You are here) went to BK first (21:41).
//   • No "thread" anywhere on a Global screen (BK 9/26).
//   • `source_ref` never renders; it is the gate's provenance pointer. The kid reads `citation`.
//   • Colour never carries meaning alone: every line is labelled in words, every stop names its
//     issues in words, and the dark issue accents ride on a light casing so they hold 3:1.
//   • A stop or line that isn't open yet shows "Coming" and doesn't open.
//   • Nothing is stored and nothing is sent.
// ============================================================
import { useEffect, useMemo, useRef, useState } from 'react'

// Global's six Enduring Issue accents (CONVENTIONS §6, BK-approved posters 9/18). They are
// dark, so every line is drawn on a light casing; the casing carries the 3:1 edge.
const ISSUE_COLOR = ['#8C2F39', '#8A4212', '#5B3A8C', '#1B6350', '#2A5568', '#1F3864']
const CASING = '#DCE3EE'

export const ISSUES_WORDS = {
  linePrefix: 'Enduring Issue',
  onThese: 'On these issues',
  doc: 'The document',
  alsoRead: 'Also read',
  connects: 'Connects to',
  here: 'You are here',
  coming: 'Coming',
  openMap: 'Open the map',
  close: 'Close',
}
const W = ISSUES_WORDS

const yearOf = s => { const m = String(s.when || '').match(/\d{3,4}/); return m ? +m[0] : 9999 }
const linesOf = s => [...new Set((s.on_lines || []).map(e => e.line))]

export function useStopMap(ref) {
  const [data, setData] = useState(null)
  useEffect(() => {
    if (!ref) { setData(false); return }
    fetch(`/content/${String(ref).replace(/^content\//, '')}`)
      .then(x => (x.ok ? x.json() : false)).then(setData).catch(() => setData(false))
  }, [ref])
  return data
}

// The framework units this course will reach (10.1 … 10.10), so the year's shape shows.
function unitsFor(data, course) {
  const nums = [...(course.units || []).map(u => String(u.number)), ...(data.stops || []).map(s => String(s.unit))]
  const pre = (nums[0] || '10.1').split('.')[0]
  return Array.from({ length: 10 }, (_, i) => `${pre}.${i + 1}`)
}

export function IssuesLane({ course, maps, onOpenMap }) {
  const entry = (course.issues || [])[0]
  const data = useStopMap(entry?.content_ref)
  const [open, setOpen] = useState(null)
  const cardRef = useRef(null)
  const byId = useMemo(() => Object.fromEntries(((data && data.stops) || []).map(s => [s.id, s])), [data])
  const lineById = useMemo(() => Object.fromEntries(((data && data.lines) || []).map((l, i) => [l.id, { ...l, color: ISSUE_COLOR[i % 6] }])), [data])
  const subById = useMemo(() => Object.fromEntries(((data && data.lines) || []).flatMap(l => (l.subs || []).map(s => [s.id, s]))), [data])

  if (data === null) return <div className="loading">Opening the map&hellip;</div>
  if (!data) return <div className="empty"><div className="empty-title">Not open yet.</div></div>

  const here = (course.units || []).find(u => u.slug === course.current_unit)?.number
  const units = unitsFor(data, course)
  const pick = id => {
    const s = byId[id]
    if (!s || s.status === 'building') return
    setOpen(id)
    requestAnimationFrame(() => cardRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
  }
  const current = open && byId[open]
  return (
    <div className="threads issues">
      <IssuesMap data={data} lineById={lineById} units={units} here={here} open={open} onPick={pick} />
      <IssuesPhone data={data} lineById={lineById} units={units} here={here} open={open} onPick={pick} />
      <div ref={cardRef}>
        {current && <IssueStopCard stop={current} byId={byId} lineById={lineById} subById={subById} onPick={pick}
                                   onClose={() => setOpen(null)}
                                   mapId={current.atlas && (maps || []).some(m => m.id === current.atlas) ? current.atlas : null}
                                   onOpenMap={onOpenMap} />}
      </div>
    </div>
  )
}

const openCount = (data, lineId) => (data.stops || []).filter(s => s.status === 'open' && linesOf(s).includes(lineId)).length
const lineLabel = l => `${W.linePrefix} · ${l.name}`

// ── THE MAP (Chromebook and up) ─────────────────────────────────────────
const ROW_H = 50, SLOT = 64, UNIT_PAD = 26, FUTURE_W = 70, HEAD_H = 40, FOOT_H = 26, R = 9

function layout(data, units) {
  const stops = data.stops || []
  const lines = data.lines || []
  const rowIndex = Object.fromEntries(lines.map((l, i) => [l.id, i]))
  const cols = []
  const slotX = {}
  let x = UNIT_PAD
  for (const u of units) {
    const hereStops = stops.filter(s => String(s.unit) === u)
      .map((s, i) => ({ s, i })).sort((a, b) => yearOf(a.s) - yearOf(b.s) || a.i - b.i).map(o => o.s)
    const start = x
    if (hereStops.length) { hereStops.forEach((s, i) => { slotX[s.id] = x + SLOT / 2 + i * SLOT }); x += hereStops.length * SLOT }
    else x += FUTURE_W
    cols.push({ unit: u, x0: start, x1: x, coming: !hereStops.length })
    x += UNIT_PAD
  }
  return { lines, rowIndex, cols, slotX, width: x, height: HEAD_H + lines.length * ROW_H + FOOT_H }
}

function IssuesMap({ data, lineById, units, here, open, onPick }) {
  const L = useMemo(() => layout(data, units), [data, units])
  const y = id => HEAD_H + L.rowIndex[id] * ROW_H + ROW_H / 2
  const lastLive = Math.max(UNIT_PAD, ...(data.stops || []).map(s => L.slotX[s.id] || 0))
  // Open on You are here: the unit we're in is in view without a kid hunting for it.
  const scroller = useRef(null)
  useEffect(() => {
    const c = L.cols.find(x => x.unit === String(here)), el = scroller.current
    if (c && el) el.scrollLeft = Math.max(0, c.x0 - UNIT_PAD - 24)
  }, [L, here])
  return (
    <div className="threads-map issues-map" role="group" aria-label="Enduring Issues map">
      <div className="threads-labels issues-labels" aria-hidden="true">
        <div style={{ height: HEAD_H }} />
        {L.lines.map(l => (
          <div key={l.id} className="threads-label issues-label" style={{ height: ROW_H }}>
            <span className="swatch issue-swatch" style={{ background: lineById[l.id].color }} />
            <span>
              <span className="issue-pre">{W.linePrefix}</span><br />{l.name}
              {openCount(data, l.id) < 3 && <span className="issue-coming"> · {W.coming}</span>}
            </span>
          </div>
        ))}
      </div>
      <div className="threads-scroll" ref={scroller}>
        <svg width={L.width} height={L.height} viewBox={`0 0 ${L.width} ${L.height}`}>
          {L.cols.map(c => {
            const isHere = String(here) === c.unit
            return (
              <g key={c.unit}>
                <rect x={c.x0 - UNIT_PAD / 2} y={4} width={c.x1 - c.x0 + UNIT_PAD} height={L.height - 8} rx={8}
                      className={`col${c.coming ? ' coming' : ''}${isHere ? ' here' : ''}`} />
                <text x={(c.x0 + c.x1) / 2} y={24} textAnchor="middle" className="col-label">{c.unit}</text>
                {isHere && <text x={(c.x0 + c.x1) / 2} y={L.height - 12} textAnchor="middle" className="col-here">{W.here}</text>}
                {c.coming && !isHere && <text x={(c.x0 + c.x1) / 2} y={L.height - 12} textAnchor="middle" className="col-coming">{W.coming}</text>}
              </g>
            )
          })}
          {L.lines.map(l => {
            const yy = y(l.id), c = lineById[l.id].color
            const has = openCount(data, l.id) > 0
            return (
              <g key={l.id}>
                {has && <>
                  <line x1={UNIT_PAD / 2} x2={lastLive + SLOT / 2} y1={yy} y2={yy} stroke={CASING} strokeWidth={11} strokeLinecap="round" />
                  <line x1={UNIT_PAD / 2} x2={lastLive + SLOT / 2} y1={yy} y2={yy} stroke={c} strokeWidth={7} strokeLinecap="round" />
                </>}
                <line x1={has ? lastLive + SLOT / 2 : UNIT_PAD / 2} x2={L.width - UNIT_PAD / 2} y1={yy} y2={yy}
                      stroke={CASING} strokeWidth={3} strokeDasharray="3 9" strokeLinecap="round" opacity=".45" />
              </g>
            )
          })}
          {(data.stops || []).map(s => {
            const keys = linesOf(s).filter(k => k in L.rowIndex)
            const cx = L.slotX[s.id]
            if (cx == null || !keys.length) return null
            const ys = keys.map(y)
            const building = s.status === 'building'
            const many = keys.length > 1
            const names = keys.map(k => lineById[k].name).join(', ')
            const label = `${s.when}. ${s.title}. ${W.linePrefix}: ${names}${building ? `. ${W.coming}.` : ''}`
            const act = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(s.id) } }
            return (
              <g key={s.id} className={`stop${building ? ' building' : ''}${open === s.id ? ' open' : ''}`}
                 role="button" tabIndex={building ? -1 : 0} aria-label={label} aria-disabled={building || undefined}
                 onClick={() => onPick(s.id)} onKeyDown={act}>
                <title>{`${s.when} · ${s.title}`}</title>
                {many && <rect x={cx - R - 3} y={Math.min(...ys) - R - 3} width={2 * R + 6} height={Math.max(...ys) - Math.min(...ys) + 2 * R + 6}
                               rx={R + 3} className="interchange" />}
                {ys.map((yy, i) => <circle key={i} cx={cx} cy={yy} r={R} className="dot issue-dot" stroke={lineById[keys[i]].color} />)}
                <text x={cx} y={Math.max(...ys) + R + 13} textAnchor="middle" className="stop-when">{building ? W.coming : s.when}</text>
                <rect x={cx - SLOT / 2} y={Math.min(...ys) - ROW_H / 2} width={SLOT} height={Math.max(...ys) - Math.min(...ys) + ROW_H} className="hit" />
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

// ── PHONES: one issue at a time, top to bottom ─────────────────────────
function IssuesPhone({ data, lineById, units, here, open, onPick }) {
  const lines = data.lines || []
  const [lid, setLid] = useState(lines[0]?.id)
  const l = lineById[lid]
  const stops = (data.stops || []).filter(s => linesOf(s).includes(lid))
    .map((s, i) => ({ s, i })).sort((a, b) => units.indexOf(String(a.s.unit)) - units.indexOf(String(b.s.unit)) || yearOf(a.s) - yearOf(b.s) || a.i - b.i).map(o => o.s)
  return (
    <div className="threads-phone">
      <div className="threads-chips issue-chips" role="tablist" aria-label={W.linePrefix}>
        {lines.map(x => (
          <button key={x.id} type="button" role="tab" aria-selected={x.id === lid}
                  className={`thread-chip issue-chip${x.id === lid ? ' sel' : ''}`}
                  style={{ '--c': lineById[x.id].color }} onClick={() => setLid(x.id)}>
            {x.name}
          </button>
        ))}
      </div>
      {l && <p className="issue-line-name">{lineLabel(l)}</p>}
      {l && <p className="thread-q">{l.question}</p>}
      {!stops.length && <p className="ls-meta issue-none">{W.coming}</p>}
      <ol className="thread-line issue-line" style={{ '--c': l?.color }}>
        {stops.map((s, i) => {
          const building = s.status === 'building'
          const isHere = String(s.unit) === String(here)
          const firstHere = isHere && !(i > 0 && String(stops[i - 1].unit) === String(here))
          return (
            <li key={s.id} className={firstHere ? 'issue-here-start' : undefined}>
              {firstHere && <span className="issue-here">{W.here} · {s.unit}</span>}
              <button type="button" className={`line-stop${building ? ' building' : ''}${open === s.id ? ' open' : ''}`}
                      disabled={building} onClick={() => onPick(s.id)}>
                <span className="ls-when">{s.unit} · {s.when}</span>
                <span className="ls-title">{s.title}</span>
                {building && <span className="ls-meta">{W.coming}</span>}
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

// ── ONE STOP ─────────────────────────────────────────────────────────
function IssueStopCard({ stop, byId, lineById, subById, onPick, onClose, mapId, onOpenMap }) {
  const doc = stop.document
  const also = stop.also_read || []
  return (
    <article className="stop-card issue-card" aria-labelledby="issue-card-h">
      <div className="stop-card-top">
        <div className="stop-chips">
          {linesOf(stop).map(id => lineById[id] && (
            <span key={id} className="stop-chip issue-stop-chip" style={{ '--c': lineById[id].color }}>
              {lineLabel(lineById[id])}
            </span>
          ))}
        </div>
        <button type="button" className="btn-ghost" onClick={onClose} aria-label="Close this stop">{W.close}</button>
      </div>
      <div className="stop-when-lg">{stop.unit} · {stop.when}</div>
      <h3 id="issue-card-h" className="stop-title">{stop.title}</h3>
      <p className="stop-what">{stop.what_happened}</p>

      {mapId && <button type="button" className="btn-now stop-map" onClick={() => onOpenMap(mapId)}>{W.openMap}</button>}

      <h4 className="stop-h">{W.onThese}</h4>
      <ul className="issue-tags">
        {(stop.on_lines || []).map((e, i) => {
          const line = lineById[e.line], sub = e.sub ? subById[e.sub] : null
          return (
            <li key={i} className="issue-tag" style={{ '--c': line?.color }}>
              <div className="issue-tag-name">
                {line?.name}{sub ? <> · <b>{sub.name}</b></> : null}
              </div>
              {sub?.definition && <div className="issue-def">{sub.name}: {sub.definition}</div>}
              <p className="issue-reason">{e.reason}</p>
              {e.question && <p className="stop-q">{e.question}</p>}
            </li>
          )
        })}
      </ul>

      {doc && <>
        <h4 className="stop-h">{W.doc}</h4>
        <DocBox d={doc} />
      </>}
      {also.length > 0 && <>
        <h4 className="stop-h">{W.alsoRead}</h4>
        <div className="issue-also">{also.map((d, i) => <DocBox key={i} d={d} />)}</div>
      </>}

      {(stop.links || []).length > 0 && <>
        <h4 className="stop-h">{W.connects}</h4>
        <ul className="stop-links">
          {stop.links.map(l => {
            const to = byId[l.to]
            if (!to) return null
            const building = to.status === 'building'
            return (
              <li key={l.to}>
                <button type="button" className="link-btn" disabled={building} onClick={() => onPick(l.to)}>
                  <span className="link-to">{to.when} · {to.title}{building ? ` · ${W.coming}` : ''}</span>
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

function DocBox({ d }) {
  return (
    <div className="stop-doc">
      {d.title && <div className="stop-doc-title">{d.title}</div>}
      {d.excerpt && <blockquote className="stop-excerpt">{d.excerpt}</blockquote>}
      {d.citation && <div className="stop-cite">{d.citation}</div>}
    </div>
  )
}

export const ISSUES_STYLES = `
/* ---------- THE ENDURING ISSUES MAP (shares the Threads map's classes) ---------- */
.issues-labels{width:252px}
.issues-label{font-size:13.5px;letter-spacing:.02em}
.issue-pre{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.12em;font-size:11.5px;color:var(--grey);font-weight:600}
.issue-coming{color:var(--grey);font-weight:500;font-size:12px;text-transform:uppercase;letter-spacing:.08em}
.issue-swatch{height:10px !important;width:22px !important;border:2px solid ${CASING};box-sizing:content-box}
.threads .col.here{stroke:var(--gold);stroke-width:2;fill:color-mix(in srgb,var(--gold) 8%,transparent)}
.threads .col-here{fill:var(--gold);font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.12em}
.threads .stop .issue-dot{fill:#F4F6FA;stroke-width:5}
.threads .stop:hover .issue-dot,.threads .stop:focus-visible .issue-dot{fill:var(--gold-lit)}
.threads .stop.open .issue-dot{fill:var(--gold)}
.issue-chip{border-color:${CASING};box-shadow:inset 0 -5px 0 var(--c)}
.issue-chip.sel{background:${CASING};color:#0B1220}
.issue-line::before{background:var(--c);box-shadow:0 0 0 2px ${CASING}}
.issue-line li::before{border-color:var(--c);background:#F4F6FA}
.issue-line-name{color:var(--white);font-family:'Barlow Condensed',sans-serif;font-size:19px;letter-spacing:.06em;text-transform:uppercase;margin:6px 0 2px}
.issue-none{margin:0 0 10px}
.issue-stop-chip{border-color:${CASING};box-shadow:inset 4px 0 0 var(--c);padding-left:12px}
.issue-tags{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.issue-tag{border:1px solid var(--edge);border-left:6px solid var(--c);outline:0;border-radius:8px;padding:10px 12px;
  background:color-mix(in srgb,var(--canvas) 40%,var(--card));position:relative}
.issue-tag::before{content:'';position:absolute;left:-6px;top:-1px;bottom:-1px;width:2px;background:${CASING};border-radius:2px 0 0 2px}
.issue-tag-name{color:var(--white);font-family:'Barlow Condensed',sans-serif;font-size:17px;letter-spacing:.05em;text-transform:uppercase}
.issue-tag-name b{color:var(--gold-lit);font-weight:700}
.issue-def{color:var(--grey);font-size:14px;line-height:1.45;margin-top:2px}
.issue-reason{color:var(--white);font-size:16px;line-height:1.55;margin:6px 0 4px}
.issue-also{display:grid;gap:8px}
.issue-here{display:block;margin:6px 0 6px;color:var(--gold);font-family:'Barlow Condensed',sans-serif;font-weight:700;
  font-size:15px;letter-spacing:.12em;text-transform:uppercase}
.issue-here-start::before{top:44px !important}
`
