// ============================================================
// THE STOP MAP — one engine for the U.S. Threads map and Global's Enduring Issues map
// (map-stop-shape, Sam + Will). Redesign ordered by BK, 2026-10-05 23:39 / 23:42:
//   "event info and the exemnplar paragraph with context, claim, evidence, and explanation/link
//    be a pop out box from that timeline...and then a line that connects across threads to the
//    other popout box showing the relationshiop...explaining the change over time (or the same
//    over time)" — "the common threads stay light or highlight while the irrelevant ones fade"
//    — "if the boxes utilize any visuals or thumbnails of resepective docs that's fine too."
//   23:42 "2. yes": the Enduring Issues map gets the same treatment.
//   23:47 "yes" to the labels (Context · Claim · Evidence · Explanation / Link) and the tags
//   (Change over time · Continuity).
//
// How it reads:
//   • Tap a stop. A box pops out of the timeline beneath it, tied to the stop by a leader line.
//   • If the stop connects to another, that stop's box pops out too, the map draws a line across
//     the rows between the two stops, and a bridge between the boxes names the relationship
//     (Change over time, or Continuity) with the desk's explanation.
//   • The rows those two stops sit on stay lit; every other row and stop fades.
//   • Phones (no map, one line at a time) get the same boxes stacked in a sheet.
//
// The rules this file keeps:
//   • The desks own every word a student reads here (Sam: Threads; Will: Enduring Issues).
//     Nothing is rewritten. The few words this file adds are in each WORDS block, each with
//     its ruling.
//   • No "thread" anywhere on a Global screen (BK 9/26).
//   • `source_ref` never renders: it is the gate's provenance pointer. The kid reads `citation`.
//   • Colour never carries meaning alone: rows are labelled in words, the boxes name their
//     lines in words, and the bridge names the relationship in words.
//   • Keyboard: every stop is a button; Esc closes; focus moves into the box and back.
//     Reduced motion: no drawing or gliding.
//   • Nothing is stored and nothing is sent.
// ============================================================
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

const PROOF = import.meta.env.VITE_ATLAS_PROOF === '1'

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// ── THE TWO COURSES ─────────────────────────────────────────────────────
// Threads (US): light line colours on navy (all ≥ 3:1 on #0B1220); Thread 1's subs are strands.
const THREAD_COLOR = {
  t1: '#C3CCDA', 't1-aa': '#5B9BD5', 't1-women': '#B08AD6', 't1-native': '#D08A5F',
  t2: '#3FB8AF', t3: '#7BC96F', t4: '#E07BB0', t5: '#CFC36A', t6: '#56C6E8', t7: '#E8A0A2',
}
// Global's six Enduring Issue accents (CONVENTIONS §6). Dark, so drawn on a light casing.
const ISSUE_COLOR = ['#8C2F39', '#8A4212', '#5B3A8C', '#1B6350', '#2A5568', '#1F3864']
const CASING = '#DCE3EE'

// Words the container adds. Each came to BK first.
const COMMON_WORDS = {
  here: 'You are here',                 // BK 21:41 (Global); carried to Threads with the shared engine
  coming: 'Coming',
  openMap: 'Open the map',
  close: 'Close',
  doc: 'The document',
  alsoRead: 'Also read',
  connects: 'Connects to',
  // BK 23:47 "yes": the four labels, and the two tags on the connecting line.
  part: { context: 'Context', claim: 'Claim', evidence: 'Evidence', explain: 'Explanation / Link' },
  kind: { change: 'Change over time', continuity: 'Continuity' },
  openDoc: 'Open in Doc Assist',        // proposed to BK in the morning proof
}
export const STOPMAP_WORDS = {
  threads: { ...COMMON_WORDS, aria: 'Threads map', pick: 'Pick a thread', onTwo: 'On two threads', question: 'The thread’s question',
             lineLabel: l => `${l.number} · ${l.name}` },
  issues:  { ...COMMON_WORDS, aria: 'Enduring Issues map', pick: null, onTwo: null, question: null, linePrefix: 'Enduring Issue',
             lineLabel: l => `Enduring Issue · ${l.name}` },
}

const yearOf = s => { const m = String(s.when || '').match(/\d{3,4}/); return m ? +m[0] : 9999 }
const linesOf = s => [...new Set((s.on_lines || []).map(e => e.line))]
const assetSrc = f => (/^(https?:)?\//.test(String(f)) ? f : `/content/${String(f || '').split('/').pop()}`)

// ── DATA ────────────────────────────────────────────────────────────────
function useStopFile(ref) {
  const [data, setData] = useState(null)
  useEffect(() => {
    if (!ref) { setData(false); return }
    const name = String(ref).replace(/^content\//, '')
    const url = PROOF ? `/_proof/${name}` : `/content/${name}`
    fetch(url).then(x => (x.ok ? x.json() : (PROOF ? fetch(`/content/${name}`).then(y => (y.ok ? y.json() : false)) : false)))
      .then(setData).catch(() => setData(false))
  }, [ref])
  return data
}

// Every link both ways: a stop shows the connections it names and the ones that name it.
// The naming stop's own words win; a reverse entry carries the same kind and explanation.
function linkIndex(stops) {
  const idx = {}
  const add = (from, l, reverse) => {
    const list = (idx[from] = idx[from] || [])
    if (list.some(x => x.to === l.to)) return
    list.push({ ...l, reverse })
  }
  for (const s of stops) for (const l of s.links || []) add(s.id, l, false)
  for (const s of stops) for (const l of s.links || []) add(l.to, { ...l, to: s.id }, true)
  return idx
}

// Doc Assist thumbnails and the "Open in Doc Assist" link: a stop's `doc_assist` key is
// "<unit>/<casefile>/<n>". The unit's pack is read once, when a stop that names it is opened.
const COURSE_KEY = { us11r: 'us', global10r: 'global' }
function useDocAssistPacks(course) {
  const [packs, setPacks] = useState({})
  const asked = useRef(new Set())
  const need = unit => {
    if (!unit || asked.current.has(unit)) return
    asked.current.add(unit)
    const u = (course.units || []).find(x => String(x.number) === String(unit))
    const ref = u?.doc_assist?.published && u.doc_assist.content_ref
    if (!ref) return
    fetch(`/content/${String(ref).replace(/^content\//, '')}`).then(r => (r.ok ? r.json() : null))
      .then(p => p && setPacks(o => ({ ...o, [unit]: p }))).catch(() => {})
  }
  const lookup = stop => {
    const k = String(stop?.doc_assist || '').split('/')
    if (k.length !== 3) return null
    const [unit, cf, n] = k
    const u = (course.units || []).find(x => String(x.number) === unit)
    const link = u ? `#/${COURSE_KEY[course.id] || course.id}/${unit}/doc-assist/${cf}/${n}` : null
    const pack = packs[unit]
    const doc = pack && (pack.casefiles || []).find(c => String(c.id).toUpperCase() === cf.toUpperCase())?.docs
      ?.find(d => String(d.n).toLowerCase() === n.toLowerCase())
    const im = doc && ((Array.isArray(doc.images) && doc.images[0]) || (doc.image_file && { file: doc.image_file, alt: doc.image_alt }))
    return { unit, link, img: im ? { src: assetSrc(im.file), alt: im.alt || im.describe || doc.image_alt || '' } : null }
  }
  return { need, lookup }
}

// ── THE LANE ────────────────────────────────────────────────────────────
export function StopMapLane({ course, kind, maps, onOpenMap }) {
  const W = STOPMAP_WORDS[kind]
  const entry = ((kind === 'threads' ? course.threads : course.issues) || [])[0]
  const data = useStopFile(entry?.content_ref)
  const [open, setOpen] = useState(null)     // the stop the kid tapped
  const [pair, setPair] = useState(null)     // the stop it's connected to, shown beside it
  const [via, setVia] = useState(null)       // the row it was tapped on (for exemplar_by_line)
  const da = useDocAssistPacks(course)

  const stops = useMemo(() => (data && data.stops) || [], [data])
  const byId = useMemo(() => Object.fromEntries(stops.map(s => [s.id, s])), [stops])
  const links = useMemo(() => linkIndex(stops), [stops])

  // Rows. Threads: each line, then its subs as strands. Enduring Issues: one row per issue.
  const rows = useMemo(() => {
    const out = []
    ;((data && data.lines) || []).forEach((l, i) => {
      if (kind === 'threads') {
        out.push({ key: l.id, line: l, label: W.lineLabel(l), color: THREAD_COLOR[l.id] || '#C3CCDA' })
        for (const s of l.subs || []) out.push({ key: s.id, line: l, sub: s, strand: true, label: s.name, color: THREAD_COLOR[s.id] || THREAD_COLOR[l.id] })
      } else out.push({ key: l.id, line: l, label: l.name, color: ISSUE_COLOR[i % 6], casing: true })
    })
    return out
  }, [data, kind, W])
  const rowByKey = useMemo(() => Object.fromEntries(rows.map(r => [r.key, r])), [rows])
  const rowKeysOf = useMemo(() => s => [...new Set((s.on_lines || []).map(e => (e.sub && rowByKey[e.sub] ? e.sub : e.line)))].filter(k => rowByKey[k]),
    [rowByKey])
  const subById = useMemo(() => Object.fromEntries(((data && data.lines) || []).flatMap(l => (l.subs || []).map(s => [s.id, s]))), [data])
  const lineById = useMemo(() => Object.fromEntries(rows.filter(r => !r.strand).map(r => [r.key, r])), [rows])

  const units = useMemo(() => {
    const nums = [...(course.units || []).map(u => String(u.number)), ...stops.map(s => String(s.unit))]
    const pre = (nums[0] || '1.1').split('.')[0]
    return Array.from({ length: 10 }, (_, i) => `${pre}.${i + 1}`)
  }, [course, stops])
  const here = (course.units || []).find(u => u.slug === course.current_unit)?.number

  useEffect(() => { if (!open) return; da.need(byId[open]?.doc_assist?.split('/')[0]); if (pair) da.need(byId[pair]?.doc_assist?.split('/')[0]) }, [open, pair, byId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (data === null) return <div className="loading">Opening the map&hellip;</div>
  if (!data) return <div className="empty"><div className="empty-title">Not open yet.</div></div>

  const usable = id => byId[id] && byId[id].status !== 'building'
  // Opening a stop pairs it with its first connection, a stop on a different line first:
  // the connection across the map is the point.
  const firstPair = id => {
    const ls = (links[id] || []).filter(l => usable(l.to))
    const mine = new Set(linesOf(byId[id]))
    return (ls.find(l => !linesOf(byId[l.to]).some(x => mine.has(x))) || ls[0])?.to || null
  }
  const pick = (id, row) => {
    if (!usable(id)) return
    if (id === open) { setVia(row || via); return }
    setOpen(id); setVia(row || null); setPair(firstPair(id))
  }
  const close = () => { setOpen(null); setPair(null); setVia(null) }
  const link = open && pair ? (links[open] || []).find(l => l.to === pair) : null

  const ctx = { W, kind, byId, rows, rowByKey, rowKeysOf, lineById, subById, units, here, links, maps, onOpenMap, da }
  return (
    <div className={`threads stopmap${kind === 'issues' ? ' issues' : ''}`}>
      <StopMapWide ctx={ctx} open={open} pair={pair} via={via} link={link} onPick={pick} onPair={setPair} onClose={close} />
      <StopMapPhone ctx={ctx} open={open} pair={pair} link={link} onPick={pick} onPair={setPair} onClose={close} />
    </div>
  )
}

// ── THE MAP (Chromebook and up) ─────────────────────────────────────────
const ROW_H = 48, SLOT = 64, UNIT_PAD = 26, FUTURE_W = 70, HEAD_H = 40, FOOT_H = 26, R = 9
// Box width follows the map's visible width, so both boxes and the bridge fit in one view.
const BRIDGE_W = 230, DECK_GAP = 34
const boxWidth = cw => Math.round(Math.min(400, Math.max(290, (cw - BRIDGE_W - 28) / 2)))

function layout(rows, stops, units) {
  const rowIndex = Object.fromEntries(rows.map((r, i) => [r.key, i]))
  const cols = [], slotX = {}
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
  return { rowIndex, cols, slotX, width: x, height: HEAD_H + rows.length * ROW_H + FOOT_H }
}

function StopMapWide({ ctx, open, pair, via, link, onPick, onPair, onClose }) {
  const { W, byId, rows, rowByKey, rowKeysOf, units, here, links } = ctx
  const stops = Object.values(byId)
  const L = useMemo(() => layout(rows, stops, units), [rows, stops, units]) // eslint-disable-line react-hooks/exhaustive-deps
  const y = key => HEAD_H + L.rowIndex[key] * ROW_H + ROW_H / 2
  const lastLive = Math.max(UNIT_PAD, ...stops.map(s => L.slotX[s.id] || 0))
  const scroller = useRef(null)
  const placed = useRef(false)
  const boxA = useRef(null), boxB = useRef(null), headA = useRef(null), canvas = useRef(null)
  const [deckH, setDeckH] = useState(0)
  const [cw, setCw] = useState(900)
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    const m = () => setCw(el.clientWidth || 900)
    m()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(m) : null
    ro?.observe(el)
    return () => ro?.disconnect()
  }, [])
  const BOX_W = boxWidth(cw)

  // Arrive on You are here, once; tapping a stop later never yanks the map back.
  useEffect(() => {
    if (placed.current) return
    const c = L.cols.find(x => x.unit === String(here)), el = scroller.current
    if (c && el) { el.scrollLeft = Math.max(0, c.x0 - UNIT_PAD - 24); placed.current = true }
  }, [L, here])

  // What stays lit: the rows the open stop and its pair sit on, the two stops, and the open
  // stop's other connections (their dots only).
  const lit = useMemo(() => {
    if (!open) return null
    const rowsLit = new Set([...rowKeysOf(byId[open]), ...(pair ? rowKeysOf(byId[pair]) : [])])
    const stopsLit = new Set([open, ...(links[open] || []).map(l => l.to)])
    return { rowsLit, stopsLit }
  }, [open, pair, byId, links, rowKeysOf])

  // Where things sit. A stop's anchor row is the one nearest the other stop of the pair.
  const anchorY = (id, towards) => {
    const ys = rowKeysOf(byId[id]).map(y)
    if (!ys.length) return HEAD_H
    if (towards == null) return Math.max(...ys)
    return ys.reduce((a, b) => (Math.abs(b - towards) < Math.abs(a - towards) ? b : a))
  }
  const deckTop = L.height + DECK_GAP
  const place = useMemo(() => {
    if (!open) return null
    const xa = L.slotX[open], xb = pair ? L.slotX[pair] : null
    let a = Math.max(10, xa - BOX_W / 2), b = null
    if (xb != null) {
      b = xb - BOX_W / 2
      if (xb >= xa) b = Math.max(b, a + BOX_W + BRIDGE_W)
      else {
        b = Math.min(b, a - BOX_W - BRIDGE_W)
        if (b < 10) { a += 10 - b; b = 10 }
      }
    }
    const right = Math.max(a, b ?? 0) + BOX_W + 16
    return { a, b, xa, xb, width: Math.max(L.width, right) }
  }, [open, pair, L, BOX_W])

  // The deck is as tall as its taller box.
  useLayoutEffect(() => {
    if (!open) { setDeckH(0); return }
    const measure = () => setDeckH(Math.max(boxA.current?.offsetHeight || 0, boxB.current?.offsetHeight || 0))
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    if (ro) { boxA.current && ro.observe(boxA.current); boxB.current && ro.observe(boxB.current) }
    return () => ro?.disconnect()
  }, [open, pair])

  // On open: bring the pair into view across, and the boxes up into the window.
  const lastOpen = useRef(null)
  useEffect(() => {
    if (!open || !place) return
    const el = scroller.current
    const lo = Math.min(place.a, place.b ?? place.a), hi = Math.max(place.a, place.b ?? place.a) + BOX_W
    if (el) {
      const want = (lo + hi) / 2 - el.clientWidth / 2
      const fits = hi - lo <= el.clientWidth
      const target = fits ? want : lo - 12
      if (target < el.scrollLeft || hi > el.scrollLeft + el.clientWidth || lo < el.scrollLeft)
        el.scrollTo({ left: Math.max(0, target), behavior: reducedMotion() ? 'auto' : 'smooth' })
    }
    if (lastOpen.current !== open && deckH > 0) {
      lastOpen.current = open
      headA.current?.focus({ preventScroll: true })
      const c = canvas.current
      if (c) {
        const top = c.getBoundingClientRect().top + window.scrollY
        const vh = window.innerHeight
        // The tapped stop near the top, its leader running down into the boxes; if that leaves
        // less than 200px of box on screen, lift until it doesn't.
        const dotY = Math.min(ya, pair ? yb : ya)
        const goal = Math.min(top + dotY - 80, top + deckTop - (vh - 200))
        window.scrollTo({ top: Math.max(0, goal), behavior: reducedMotion() ? 'auto' : 'smooth' })
      }
    }
  }, [open, pair, place, deckTop, deckH])

  useEffect(() => {
    if (!open) { lastOpen.current = null; return }
    const k = e => { if (e.key === 'Escape') { onClose() } }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, onClose])

  const height = open ? deckTop + deckH + 24 : L.height
  const width = place ? place.width : L.width
  const ya = open ? anchorY(open, pair ? anchorY(pair) : null) : 0
  const yb = pair ? anchorY(pair, ya) : 0
  const leader = (x, yy, left) => {
    const tx = Math.min(Math.max(x, left + 26), left + BOX_W - 26)
    return `M ${x} ${yy + R + 2} L ${x} ${L.height - FOOT_H + 6} C ${x} ${deckTop - 8}, ${tx} ${L.height}, ${tx} ${deckTop}`
  }

  return (
    <div className={`threads-map stopmap-map${open ? ' focused' : ''}`} role="group" aria-label={W.aria}>
      <div className="threads-labels stopmap-labels" aria-hidden="true">
        <div style={{ height: HEAD_H }} />
        {rows.map(r => (
          <div key={r.key} className={`threads-label${r.strand ? ' strand' : ''}${lit && !lit.rowsLit.has(r.key) ? ' faded' : ''}${lit && lit.rowsLit.has(r.key) ? ' lit' : ''}`}
               style={{ height: ROW_H }}>
            <span className={`swatch${r.casing ? ' issue-swatch' : ''}`} style={{ background: r.color }} />
            {r.casing ? <span><span className="issue-pre">{W.linePrefix}</span><br />{r.label}</span> : r.label}
          </div>
        ))}
      </div>
      <div className="threads-scroll" ref={scroller}>
        <div className="stopmap-canvas" ref={canvas} style={{ width, height }}>
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="stopmap-svg">
            {L.cols.map(c => {
              const isHere = String(here) === c.unit
              return (
                <g key={c.unit} className={lit ? 'faded-soft' : undefined}>
                  <rect x={c.x0 - UNIT_PAD / 2} y={4} width={c.x1 - c.x0 + UNIT_PAD} height={L.height - 8} rx={8}
                        className={`col${c.coming ? ' coming' : ''}${isHere ? ' here' : ''}`} />
                  <text x={(c.x0 + c.x1) / 2} y={24} textAnchor="middle" className="col-label">{c.unit}</text>
                  {isHere && <text x={(c.x0 + c.x1) / 2} y={L.height - 10} textAnchor="middle" className="col-here">{W.here}</text>}
                  {c.coming && !isHere && <text x={(c.x0 + c.x1) / 2} y={L.height - 10} textAnchor="middle" className="col-coming">{W.coming}</text>}
                </g>
              )
            })}
            {rows.map(r => {
              const yy = y(r.key)
              const cls = lit ? (lit.rowsLit.has(r.key) ? 'row lit' : 'row faded') : 'row'
              const w1 = r.strand ? 4 : 6
              return (
                <g key={r.key} className={cls}>
                  {r.casing && <line x1={UNIT_PAD / 2} x2={lastLive + SLOT / 2} y1={yy} y2={yy} stroke={CASING} strokeWidth={11} strokeLinecap="round" />}
                  <line x1={UNIT_PAD / 2} x2={lastLive + SLOT / 2} y1={yy} y2={yy} stroke={r.color} strokeWidth={r.casing ? 7 : w1} strokeLinecap="round" className="row-line" />
                  <line x1={lastLive + SLOT / 2} x2={L.width - UNIT_PAD / 2} y1={yy} y2={yy} stroke={r.casing ? CASING : r.color}
                        strokeWidth={3} strokeDasharray="3 9" strokeLinecap="round" opacity=".45" />
                </g>
              )
            })}

            {/* The connections from the open stop: the pair's bold and tagged, the others thin. */}
            {open && (links[open] || []).filter(l => L.slotX[l.to] != null).map(l => {
              const x1 = L.slotX[open], x2 = L.slotX[l.to]
              const y2 = anchorY(l.to, ya), y1 = anchorY(open, y2)
              const sel = l.to === pair
              const dx = Math.max(40, Math.abs(x2 - x1) / 2) * Math.sign(x2 - x1 || 1)
              const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`
              return (
                <path key={`${l.to}-${sel}`} d={d} pathLength="1" className={`xlink${sel ? ' sel' : ''}`} />
              )
            })}

            {stops.map(s => {
              const keys = rowKeysOf(s).filter(k => k in L.rowIndex)
              const cx = L.slotX[s.id]
              if (cx == null || !keys.length) return null
              const ys = keys.map(y)
              const building = s.status === 'building'
              const many = keys.length > 1
              const names = linesOf(s).map(k => rowByKey[k]?.label).filter(Boolean).join(', ')
              const label = `${s.when}. ${s.title}. ${names}${building ? `. ${W.coming}.` : ''}`
              const state = open === s.id ? ' open' : pair === s.id ? ' paired' : ''
              const fade = lit && !lit.stopsLit.has(s.id) ? ' faded' : ''
              const act = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(s.id) } }
              return (
                <g key={s.id} className={`stop${building ? ' building' : ''}${state}${fade}`}
                   role="button" tabIndex={building ? -1 : 0} aria-label={label} aria-disabled={building || undefined}
                   aria-pressed={open === s.id || undefined} onKeyDown={act}>
                  <title>{`${s.when} · ${s.title}`}</title>
                  {many && <rect x={cx - R - 3} y={Math.min(...ys) - R - 3} width={2 * R + 6} height={Math.max(...ys) - Math.min(...ys) + 2 * R + 6}
                                 rx={R + 3} className="interchange" />}
                  {ys.map((yy, i) => <circle key={i} cx={cx} cy={yy} r={R} className={`dot${ctx.kind === 'issues' ? ' issue-dot' : ''}`} stroke={rowByKey[keys[i]].color} />)}
                  <text x={cx} y={Math.max(...ys) + R + 13} textAnchor="middle" className="stop-when">{building ? W.coming : s.when}</text>
                  {keys.map(k => (
                    <rect key={k} x={cx - SLOT / 2} y={y(k) - ROW_H / 2} width={SLOT} height={ROW_H} className="hit"
                          onClick={() => onPick(s.id, k)} />
                  ))}
                </g>
              )
            })}

            {/* Leaders from the stops down to their boxes, and the bridge between the boxes. */}
            {place && <path d={leader(place.xa, ya, place.a)} className="leader a" />}
            {place && place.b != null && <path d={leader(place.xb, yb, place.b)} className="leader b" />}
            {place && place.b != null && (() => {
              const yy = deckTop + 30
              const [l, r] = place.b > place.a ? [place.a + BOX_W, place.b] : [place.b + BOX_W, place.a]
              return <g className="bridge-line">
                <line x1={l + 2} x2={r - 2} y1={yy} y2={yy} />
                <path d={`M ${l + 12} ${yy - 7} L ${l + 2} ${yy} L ${l + 12} ${yy + 7}`} />
                <path d={`M ${r - 12} ${yy - 7} L ${r - 2} ${yy} L ${r - 12} ${yy + 7}`} />
              </g>
            })()}
          </svg>

          {open && (
            <div className="stopmap-deck" style={{ top: deckTop }}>
              <div className="pop-box a" ref={boxA} style={{ left: place.a, width: BOX_W }}>
                <PopBox ctx={ctx} stop={ctx.byId[open]} via={via} headRef={headA} onClose={onClose}
                        pair={pair} onPair={onPair} onPick={onPick} main />
              </div>
              {pair && (
                <>
                  <div className="pop-bridge" style={{ left: (Math.min(place.a, place.b) + BOX_W + Math.max(place.a, place.b)) / 2 - (BRIDGE_W - 28) / 2, width: BRIDGE_W - 28 }}>
                    <Bridge W={W} link={link} />
                  </div>
                  <div className="pop-box b" ref={boxB} style={{ left: place.b, width: BOX_W }}>
                    <PopBox ctx={ctx} stop={ctx.byId[pair]} via={via} onPick={onPick} />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── THE BRIDGE: the relationship between the two stops ───────────────────
function Bridge({ W, link, vertical }) {
  if (!link) return null
  const tag = W.kind[link.kind]
  return (
    <div className={`bridge${vertical ? ' vertical' : ''}`} role="note" aria-label={tag || W.connects}>
      {tag && <div className={`bridge-tag ${link.kind}`}>{tag}</div>}
      <p className="bridge-text">{link.explain || link.why}</p>
    </div>
  )
}

// ── ONE BOX ─────────────────────────────────────────────────────────────
function PopBox({ ctx, stop, via, headRef, onClose, pair, onPair, onPick, main }) {
  const { W, kind, byId, rowByKey, lineById, subById, links, maps, onOpenMap, da } = ctx
  if (!stop) return null
  const doc = stop.document
  const ex = (via && stop.exemplar_by_line && (stop.exemplar_by_line[via] || stop.exemplar_by_line[rowByKey[via]?.line?.id]))
    || stop.exemplar || (stop.exemplar_by_line && Object.values(stop.exemplar_by_line)[0]) || null
  const mapId = stop.atlas && (maps || []).some(m => m.id === stop.atlas) ? stop.atlas : null
  const dl = da.lookup(stop)
  const thumb = stop.image ? { src: assetSrc(stop.image), alt: stop.image_alt || '' } : dl?.img
  const conns = main ? (links[stop.id] || []).filter(l => byId[l.to]) : []
  const chipName = e => {
    const l = lineById[e.line]
    if (!l) return null
    if (kind === 'issues') return `${W.linePrefix} · ${l.line.name}${e.sub && subById[e.sub] ? ` · ${subById[e.sub].name}` : ''}`
    return `${W.lineLabel(l.line)}${e.sub && subById[e.sub] ? ` · ${subById[e.sub].name}` : ''}`
  }
  const colorOf = e => (rowByKey[e.sub]?.color || rowByKey[e.line]?.color)
  const hid = `pop-h-${stop.id}`
  return (
    <article className={`pop${main ? ' main' : ' second'}`} aria-labelledby={hid}>
      <div className="pop-top">
        <div className="stop-chips">
          {(stop.on_lines || []).map((e, i) => {
            const n = chipName(e)
            return n && <span key={i} className={`stop-chip${kind === 'issues' ? ' issue-stop-chip' : ''}`} style={{ '--c': colorOf(e) }}>{n}</span>
          })}
        </div>
        {main && <button type="button" className="btn-ghost pop-close" onClick={onClose} aria-label="Close this stop">{W.close}</button>}
      </div>
      <div className="stop-when-lg">{stop.unit} &middot; {stop.when}</div>
      <h3 id={hid} className="stop-title pop-title" ref={headRef} tabIndex={-1}>
        {main ? stop.title : <button type="button" className="pop-title-btn" onClick={() => onPick(stop.id)}>{stop.title}</button>}
      </h3>
      <p className="stop-what">{stop.what_happened}</p>

      {doc && (
        <div className="pop-doc">
          {thumb && (dl?.link
            ? <a className="pop-thumb" href={dl.link}><img src={thumb.src} alt={thumb.alt} loading="lazy" /></a>
            : <span className="pop-thumb"><img src={thumb.src} alt={thumb.alt} loading="lazy" /></span>)}
          {!thumb && <span className="pop-thumb paper" aria-hidden="true"><span>{doc.title}</span></span>}
          <div className="pop-doc-body">
            <div className="stop-doc-label">{W.doc}</div>
            {doc.title && <div className="stop-doc-title">{doc.title}</div>}
            {doc.excerpt && <blockquote className="stop-excerpt">{doc.excerpt}</blockquote>}
            {doc.citation && <div className="stop-cite">{doc.citation}</div>}
            {dl?.link && <a className="pop-da" href={dl.link}>{W.openDoc}</a>}
          </div>
        </div>
      )}

      {ex ? (
        <p className="pop-ex">
          {['context', 'claim', 'evidence', 'explain'].map(k => ex[k] && (
            <span key={k} className={`pop-ex-part ${k}`}><span className="pop-ex-label">{W.part[k]}</span> {ex[k]} </span>
          ))}
        </p>
      ) : (
        // A stop without an exemplar yet shows the desk's reasons, as before.
        (stop.on_lines || []).map((e, i) => (
          <div key={i} className="thread-entry" style={{ '--c': colorOf(e) }}>
            {e.reason && <p className="thread-entry-why">{e.reason}</p>}
            {e.question && <p className="stop-q">{e.question}</p>}
          </div>
        ))
      )}

      {mapId && <button type="button" className="btn-now stop-map" onClick={() => onOpenMap(mapId)}>{W.openMap}</button>}

      {conns.length > 0 && (
        <>
          <h4 className="stop-h">{W.connects}</h4>
          <ul className="pop-conns">
            {conns.map(l => {
              const to = byId[l.to]
              const building = to.status === 'building'
              const sel = l.to === pair
              return (
                <li key={l.to}>
                  <button type="button" className={`pop-conn${sel ? ' sel' : ''}`} disabled={building} aria-pressed={sel}
                          onClick={() => onPair(l.to)}>
                    <span className="link-to">{to.when} &middot; {to.title}{building ? ` · ${W.coming}` : ''}</span>
                    {W.kind[l.kind] && <span className={`pop-conn-tag ${l.kind}`}>{W.kind[l.kind]}</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </article>
  )
}

// ── PHONES: one line at a time; the boxes open in a sheet ────────────────
function StopMapPhone({ ctx, open, pair, link, onPick, onPair, onClose }) {
  const { W, kind, byId, rows, rowKeysOf, units, here } = ctx
  const top = rows.filter(r => !r.strand)
  const [lid, setLid] = useState(top[0]?.key)
  const l = ctx.rowByKey[lid]
  const stops = Object.values(byId).filter(s => linesOf(s).includes(lid))
    .map((s, i) => ({ s, i })).sort((a, b) => units.indexOf(String(a.s.unit)) - units.indexOf(String(b.s.unit)) || yearOf(a.s) - yearOf(b.s) || a.i - b.i).map(o => o.s)
  const sheet = useRef(null), head = useRef(null), back = useRef(null)
  useEffect(() => {
    if (!open || !sheet.current || getComputedStyle(sheet.current).display === 'none') return
    back.current = document.activeElement
    head.current?.focus({ preventScroll: true })
    sheet.current.scrollTop = 0
    document.body.classList.add('sheet-open')
    return () => { document.body.classList.remove('sheet-open'); back.current?.focus?.({ preventScroll: true }) }
  }, [open])
  return (
    <div className="threads-phone">
      {W.pick && <p className="threads-pick" id="pick-line">{W.pick}</p>}
      <div className={`threads-chips${kind === 'issues' ? ' issue-chips' : ''}`} role="tablist" aria-labelledby={W.pick ? 'pick-line' : undefined} aria-label={W.pick ? undefined : W.linePrefix}>
        {top.map(x => (
          <button key={x.key} type="button" role="tab" aria-selected={x.key === lid}
                  className={`thread-chip${kind === 'issues' ? ' issue-chip' : ''}${x.key === lid ? ' sel' : ''}`}
                  style={{ '--c': x.color }} onClick={() => setLid(x.key)}>
            {kind === 'threads' ? <><b>{x.line.number}</b> {x.line.name}</> : x.line.name}
          </button>
        ))}
      </div>
      {l && kind === 'issues' && <p className="issue-line-name">{W.lineLabel(l.line)}</p>}
      {l && <p className="thread-q">{l.line.question}</p>}
      {!stops.length && <p className="ls-meta issue-none">{W.coming}</p>}
      <ol className={`thread-line${kind === 'issues' ? ' issue-line' : ''}`} style={{ '--c': l?.color }}>
        {stops.map((s, i) => {
          const building = s.status === 'building'
          const isHere = String(s.unit) === String(here)
          const firstHere = isHere && !(i > 0 && String(stops[i - 1].unit) === String(here))
          const strandKey = rowKeysOf(s).find(k => ctx.rowByKey[k]?.strand && ctx.rowByKey[k].line.id === lid)
          return (
            <li key={s.id} className={firstHere ? 'issue-here-start' : undefined} style={strandKey ? { '--c': ctx.rowByKey[strandKey].color } : undefined}>
              {firstHere && <span className="issue-here">{W.here} &middot; {s.unit}</span>}
              <button type="button" className={`line-stop${building ? ' building' : ''}${open === s.id ? ' open' : ''}`}
                      disabled={building} onClick={() => onPick(s.id, strandKey || lid)}>
                <span className="ls-when">{s.unit} &middot; {s.when}</span>
                <span className="ls-title">{s.title}</span>
                {strandKey && <span className="ls-meta">{ctx.rowByKey[strandKey].label}</span>}
                {W.onTwo && linesOf(s).length > 1 && <span className="ls-meta">{W.onTwo}</span>}
                {building && <span className="ls-meta">{W.coming}</span>}
              </button>
            </li>
          )
        })}
      </ol>
      {open && (
        <div className="pop-sheet" ref={sheet} role="dialog" aria-modal="true" aria-label={byId[open]?.title}
             onKeyDown={e => { if (e.key === 'Escape') onClose() }}>
          <PopBox ctx={ctx} stop={byId[open]} headRef={head} onClose={onClose} pair={pair} onPair={onPair} onPick={onPick} main />
          {pair && <>
            <Bridge W={W} link={link} vertical />
            <PopBox ctx={ctx} stop={byId[pair]} onPick={onPick} />
          </>}
          <button type="button" className="btn-ghost pop-sheet-close" onClick={onClose}>{W.close}</button>
        </div>
      )}
    </div>
  )
}

export const STOPMAP_STYLES = `
/* ---------- THE STOP MAP: pop-out boxes, the connecting line, lit and faded rows ---------- */
.stopmap-canvas{position:relative}
.stopmap-svg{display:block;position:absolute;left:0;top:0}
.stopmap .issues-labels,.stopmap.issues .stopmap-labels{width:252px}
.stopmap .threads-label{transition:opacity .25s}
.stopmap .threads-label.faded{opacity:.28}
.stopmap .threads-label.lit{color:var(--white)}
.stopmap .row{transition:opacity .3s}
.stopmap .row.faded{opacity:.14}
.stopmap .row.lit .row-line{filter:drop-shadow(0 0 5px color-mix(in srgb,var(--white) 45%,transparent))}
.stopmap .faded-soft{opacity:.55}
.stopmap .stop{transition:opacity .3s}
.stopmap .stop.faded{opacity:.2}
.stopmap .stop.paired .dot{fill:var(--gold-lit)}
.stopmap .stop.paired .stop-when{fill:var(--gold-lit);font-weight:700}
.stopmap.issues .issues-label{font-size:13.5px;letter-spacing:.02em}

.stopmap .xlink{fill:none;stroke:var(--gold-lit);stroke-width:1.6;stroke-dasharray:4 5;opacity:.7}
.stopmap .xlink.sel{stroke:var(--gold);stroke-width:4;stroke-dasharray:none;opacity:1;
  filter:drop-shadow(0 0 4px color-mix(in srgb,var(--gold) 60%,transparent))}
.stopmap .leader{fill:none;stroke:var(--gold);stroke-width:2.5}
.stopmap .leader.b{stroke:var(--gold-lit);stroke-dasharray:6 5}
.stopmap .bridge-line line,.stopmap .bridge-line path{stroke:var(--gold);stroke-width:3;fill:none;stroke-linecap:round;stroke-linejoin:round}
@media (prefers-reduced-motion:no-preference){
  .stopmap .xlink.sel{stroke-dasharray:1;stroke-dashoffset:1;animation:sm-draw .7s ease-out forwards}
  .stopmap .leader{stroke-dasharray:1 0}
  .stopmap .pop-box{animation:sm-pop .28s ease-out both}
  .stopmap .pop-box.b{animation-delay:.35s}
  .stopmap .pop-bridge{animation:sm-pop .28s ease-out .55s both}
}
@keyframes sm-draw{to{stroke-dashoffset:0}}
@keyframes sm-pop{from{opacity:0;transform:translateY(-10px) scale(.98)}to{opacity:1;transform:none}}

.stopmap-deck{position:absolute;left:0;right:0}
.pop-box{position:absolute;top:0}
.pop{background:var(--card);border:1px solid var(--edge);border-top:4px solid var(--gold);border-radius:12px;padding:14px 16px 16px;
  box-shadow:0 14px 34px rgba(0,0,0,.45);white-space:normal}
.pop.second{border-top-color:var(--gold-lit);border-top-style:dashed}
.pop-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
.pop-close{flex:none}
.pop-title{font-size:25px;outline:none;margin-top:4px}
.pop-title:focus-visible{outline:2px solid var(--gold-lit);outline-offset:2px;border-radius:4px}
.pop-title-btn{all:unset;cursor:pointer;text-decoration:underline;text-decoration-color:var(--edge);text-underline-offset:5px}
.pop-title-btn:hover{text-decoration-color:var(--gold)}
.pop-title-btn:focus-visible{outline:3px solid var(--gold-lit);outline-offset:3px;border-radius:4px}
.pop .stop-what{font-size:16px;line-height:1.55}
.pop-doc{display:flex;gap:12px;align-items:flex-start;background:color-mix(in srgb,var(--canvas) 55%,var(--card));border:1px solid var(--edge);
  border-radius:10px;padding:10px;margin:4px 0 12px}
.pop-thumb{flex:none;width:92px;height:92px;border-radius:6px;overflow:hidden;background:#F4F1E8;display:flex;align-items:center;justify-content:center;
  border:1px solid var(--edge)}
.pop-thumb img{width:100%;height:100%;object-fit:cover;display:block}
.pop-thumb.paper{background:linear-gradient(#F4F1E8,#E9E3D2);padding:8px;box-sizing:border-box}
.pop-thumb.paper span{font-family:Georgia,serif;font-size:10.5px;line-height:1.25;color:#2B2A26;text-align:left;display:-webkit-box;
  -webkit-line-clamp:6;-webkit-box-orient:vertical;overflow:hidden}
.pop-doc-body{min-width:0}
.stop-doc-label{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.1em;color:var(--gold);font-size:13px}
.pop-da{display:inline-block;margin-top:6px;color:var(--gold-lit);font-size:14px;font-weight:600;text-underline-offset:3px}
.pop-ex{margin:0 0 6px;color:var(--white);font-size:16px;line-height:1.75}
.pop-ex-part{padding:1px 2px;border-radius:3px;box-decoration-break:clone;-webkit-box-decoration-break:clone}
.pop-ex-part.context{background:color-mix(in srgb,#5B9BD5 16%,transparent)}
.pop-ex-part.claim{background:color-mix(in srgb,var(--gold) 20%,transparent)}
.pop-ex-part.evidence{background:color-mix(in srgb,#7BC96F 16%,transparent)}
.pop-ex-part.explain{background:color-mix(in srgb,#E07BB0 16%,transparent)}
.pop-ex-label{display:inline-block;font-family:'Barlow Condensed',sans-serif;font-size:12.5px;font-weight:700;letter-spacing:.1em;
  text-transform:uppercase;color:#0B1220;background:var(--white);border-radius:4px;padding:0 6px;margin-right:2px;line-height:1.5;vertical-align:1px}
.pop-ex-part.context .pop-ex-label{background:#9CC3EA}
.pop-ex-part.claim .pop-ex-label{background:var(--gold-lit)}
.pop-ex-part.evidence .pop-ex-label{background:#A9DCA0}
.pop-ex-part.explain .pop-ex-label{background:#F0B3D2}
.pop-conns{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.pop-conn{width:100%;text-align:left;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center;justify-content:space-between;
  background:var(--card-lit,var(--card));border:1px solid var(--edge);border-radius:8px;padding:8px 10px;color:var(--white);cursor:pointer;font:inherit}
.pop-conn:hover:not(:disabled){border-color:var(--gold)}
.pop-conn.sel{border-color:var(--gold);box-shadow:0 0 0 2px color-mix(in srgb,var(--gold) 35%,transparent)}
.pop-conn:disabled{opacity:.6;cursor:default}
.pop-conn-tag,.bridge-tag{font-family:'Barlow Condensed',sans-serif;font-weight:700;text-transform:uppercase;letter-spacing:.07em;font-size:13px;white-space:nowrap;
  border-radius:999px;padding:2px 10px;border:2px solid var(--gold);color:var(--gold-lit)}
.pop-conn-tag.continuity,.bridge-tag.continuity{border-style:dashed}
.pop-bridge{position:absolute;top:44px}
.bridge{background:color-mix(in srgb,var(--gold) 9%,var(--card));border:2px solid var(--gold);border-radius:12px;padding:10px 12px;
  box-shadow:0 10px 24px rgba(0,0,0,.4)}
.bridge-tag{display:inline-block;background:var(--canvas);margin-bottom:6px}
.bridge-text{margin:0;color:var(--white);font-size:15px;line-height:1.55}
.bridge.vertical{position:relative;margin:26px 0;text-align:left}
.bridge.vertical::before,.bridge.vertical::after{content:'';position:absolute;left:28px;width:3px;height:24px;background:var(--gold)}
.bridge.vertical::before{top:-26px}
.bridge.vertical::after{bottom:-26px}

.pop-sheet{display:none}
@media (max-width:700px){
  .pop-sheet{display:block;position:fixed;inset:0;z-index:60;overflow-y:auto;background:var(--canvas);
    padding:14px 12px 28px;-webkit-overflow-scrolling:touch;background:var(--canvas)}
  .pop-sheet .pop{box-shadow:none}
  .pop-sheet-close{display:block;margin:18px auto 0}
  body.sheet-open{overflow:hidden}
}
`
