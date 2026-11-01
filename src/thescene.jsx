// ============================================================
// THE SCENE — one instrument, not three tools.
// Leo's order 2026-10-31 10:13, from BK's Chat brainstorm with Leo the same morning;
// the full spec is In/the-scene-brief-2026-10-31.pdf. Built ahead of content on BK's
// word in chat ("you can start to get ahead on it...the other desks will supply content").
//
// The rulings this file keeps, every one of them BK's:
//
//   • ONE SPINE, ALWAYS VISIBLE. A dated timeline, left to right. It is never toggled
//     off. Every layer sits on top of it. Nothing else in the room changes depth.
//   • CLICKING A POINT OPENS THROWBACK. Throwback is already built and already cleared.
//     A spine point does not re-draw it, it links to it — #/<course>/throwback/<year>,
//     the link that has worked since 10/26. Clicking is the ONLY thing that drills in.
//   • LAYERS STACK, AND EACH ONE IS ITS OWN TOGGLE. Any combination can be live at once:
//     one Thread alone, three Threads, all seven, all seven plus the Deficit.
//   • NOTHING IS EVER FULLY GONE. At rest the spine is sharp and in front and every
//     layer sits behind it faint but visibly present — all of it was happening at every
//     point on the timeline whether a kid is looking or not. Toggle a layer: it brightens
//     and comes forward, the spine goes translucent behind it. Toggle a second on top:
//     the first dims back toward its resting level, the new one takes the foreground.
//     No layer ever reaches zero opacity. This is the whole feel of the room.
//   • ONE CHART DEVICE, NOT THREE. <LineOnSpine> takes a data series and a skin and draws
//     it against the shared spine. Threads uses it seven times today. A future layer is a
//     new colour and a new data source, not a new build — that is the whole point of it,
//     and it holds even though the layer it was first proved against has been cut.
//   • THE FEDERAL DEFICIT LAYER IS CUT (BK, 2026-10-31 11:37, one word: "cut"). It was built
//     and running on real OMB figures, log scale and all. Three things killed it: the
//     government's own annual record only starts at 1901, so on a 1600 spine it could only
//     ever be a fragment off to one side; nominal dollars across 230 years is a concept
//     problem for a sixteen-year-old, not a chart problem; and it was the one layer with no
//     desk behind it. Folding it into Thread 3 was raised and refused — deficit size does
//     not measure government size (2020, 1943, 2009, the late-90s surpluses all say
//     otherwise), and the room does not assert a contested claim. If it returns it returns
//     as a share of the economy on a plain linear axis. The sourced series and the full
//     sourcing account are archived under scripts/packs/, not thrown away.
//   • TRANSPORTATION IS THE SURFACE, NOT A LAYER. Always on, underneath everything,
//     evolving left to right. Navy and gold, generic, no real brands.
//   • NOTHING IS STORED AND NOTHING IS SENT. The room does not know who is looking at it,
//     does not remember which era anyone visited and never resurfaces a prediction. The
//     memory across visits is the kid's own paper casefile, not this file's business.
//   • EVERY ERA IS ADDRESSABLE. #/<course>/scene, /scene/<year>, /scene/<year>/<layers>.
//     A Regents-review link has to be able to land on one point with one layer lit.
//
// WHAT THIS FILE DOES NOT DO: it writes no content. Sam owns the party cards, the Thread
// ebb-and-flow numbers and the casefile wording; the Federal Deficit series is public
// record, sourced not authored, and waits on Danny like anything else a student reads.
// Until a layer's data is on disk, its toggle shows and says it isn't here yet — the shape
// of the room is visible before a word of it has cleared, same rule as Throwback's.
//
// THREAD HEIGHTS, read this before changing them: a Thread's line is drawn from Sam's
// signed stops file — the stops that are already live, already Danny-cleared — spread
// into a curve. It is a real reading of real data, not a shape somebody liked. The moment
// Sam sends explicit per-era intensity numbers, those win and the derived curve is gone
// (see intensityOf). Nothing here invents how contested an issue was.
// ============================================================
import { useEffect, useMemo, useRef, useState } from 'react'
import { useThreads, THREAD_COLOR } from './threads.jsx'

// Every word a student reads in this room that did not come from a desk. These are
// Josh's container words and they are NOT signed off — they sit in one object so BK
// can rule on the lot in one pass, the way the Threads lane's words were ruled.
export const SCENE_WORDS = {
  opening: 'Opening the scene…',
  empty: 'Not open yet.',
  laneIntro: 'One timeline, and everything that was happening on it. Tap a marked year to step into that moment; switch on a layer to see one story run the whole length of the country.',
  spineLabel: 'The timeline. Tap a marked year to see what it was like to live through it.',
  layersLabel: 'Layers',
  layersHint: 'Switch any of these on. They stack — run one, or run them all at once.',
  threadsGroup: 'The seven threads',
  comingTag: 'Coming',
  comingHint: 'Not here yet.',
  notYet: 'Not yet',
  openYear: year => `${year} — open the Throwback snapshot for this moment`,
  shutYear: year => `${year} — not open yet`,
  clear: 'Clear the layers',
  frontier: 'We’re here',          // BK picked it, 2026-10-31 14:30
  beforeContact: 'Before contact',
  notToScale: 'not to scale',
  zoneOpen: 'Before contact — open this',
  zoneShut: 'Before contact',

  restNote: 'Nothing is switched on. Every layer is still there, faint, behind the timeline — all of it was happening whether you were looking or not.',
}

// ── GEOMETRY ────────────────────────────────────────────────────────────
// One viewBox, scaled to whatever width the screen gives it.
// Every row gets its own air. The Platform's band used to sit on top of the spine's era
// years and you could read neither (caught in a smoke test, 2026-10-31), so the stage is
// taller and nothing shares a row: waves, then the spine and its years, then the Platform's
// band, then the surface.
const W = 1000, H = 505
const PAD_L = 46, PAD_R = 46
const WAVE_TOP = 46, WAVE_BOT = 272      // the band every wave layer is drawn into
const SPINE_Y = 310                      // the spine's rail
const PLAT_TOP = 346, PLAT_H = 20        // the Platform's band, clear of the spine's years
const ROAD_TOP = 386, ROAD_BASE = 492    // the transportation surface, underneath it all
const PLOT_W = W - PAD_L - PAD_R

// THE ZONE BEFORE CONTACT (BK, 2026-10-31 15:10, and his ruling at 15:34). Twelve thousand
// years of Indigenous North America cannot go on a linear year axis next to 1850 — squeezed
// there it renders as a sliver, and the picture ends up saying "not much happened here",
// which is a claim the drawing makes on its own whatever anyone writes in it. An empty
// landscape is no better: that is the empty-continent story, drawn.
//
// So the left of the spine is a zone, not a stretch of the axis: set apart, no year ticks,
// deliberately NOT to scale, and it says so. A thread's pre-contact level is held flat
// across it rather than plotted — presence, not precision, which is the honest thing a
// timeline can offer here. The linear years begin at contact, on the other side of a divider.
const ZONE_W = 118
const zoneOn = span => !!span?.before
const axisL = span => PAD_L + (zoneOn(span) ? ZONE_W : 0)
const axisW = span => PLOT_W - (zoneOn(span) ? ZONE_W : 0)

// Where a layer sits when it is in front, switched on behind the front one, or at rest.
// Resting is faint. Resting is never zero (BK: nothing is ever fully gone).
const OPACITY = { fore: 1, on: 0.5, ambient: 0.16 }
const STROKE = { fore: 3.4, on: 2.6, ambient: 1.8 }

// DEPTH DOWN THE TIMELINE (BK, 2026-10-31: "they can see the threads in the distance but
// they come forward as we approach the units"). The ghosting runs in two directions, not
// one. A layer is faint or sharp depending on whether it is switched on — and INDEPENDENTLY,
// the stretch of the timeline the class has not reached yet is drawn receded, while
// everything up to where the course has got is drawn near. So a kid in October sees the
// whole shape of the year standing off in the distance, and it walks toward them as the
// units are taught. Same rule as the Threads map's "Coming" columns and Throwback's shut
// eras: the shape of the course is always visible, never hidden.
const DISTANT = { fore: 0.3, on: 0.2, ambient: 0.08 }

const xOf = (year, span) => axisL(span) + ((year - span.from) / (span.to - span.from)) * axisW(span)
// A sample taken before contact lands inside the zone, evenly spread, never on the year axis.
const zoneX = (i, n) => PAD_L + 10 + (n < 2 ? 0 : (i / (n - 1)) * (ZONE_W - 26))
const yOf = (v, band) => band.bottom - Math.max(0, Math.min(1, v)) * (band.bottom - band.top)
const clampYear = (y, span) => Math.max(span.from, Math.min(span.to, y))

// A curve through the points, not a run of straight segments. Catmull-Rom, written out
// as beziers so the browser draws it without a library.
function smoothPath(pts) {
  if (!pts.length) return ''
  if (pts.length === 1) return `M ${pts[0][0]} ${pts[0][1]}`
  const d = [`M ${pts[0][0]} ${pts[0][1]}`]
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2
    d.push(`C ${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]} ${p2[1]}`)
  }
  return d.join(' ')
}

// ── THE CHART DEVICE ────────────────────────────────────────────────────
// Build it once, skin it per layer (BK: "not three separate builds"). It takes a series
// and a look and draws it against the shared spine. It knows nothing about threads,
// parties or dollars, and it must stay that way — the next layer should cost a colour
// and a data source, nothing else.
//
//   series : [{ x: <year>, y: <0..1, bottom of the band to the top> }]
//   band   : { top, bottom } in viewBox pixels
//   state  : 'fore' | 'on' | 'ambient'
//   baseline : where this series rests, same 0..1 band space. A fill runs to THAT line, not
//              to the floor, so a dip below the resting line reads as a dip and not as a
//              smaller hill. Threads rest on their own lane; the Deficit rests on balance.
//   nearMask : when given, the line is drawn twice — once full-length and receded, once
//              masked to the part of the timeline the class has already reached, near and
//              sharp. Nothing is clipped away; the far end is standing in the distance.
export function LineOnSpine({ series, span, band, color, state = 'ambient', fill = false, baseline = 0, dash = null, glowId = null, nearMask = null }) {
  // A point gives either a year (x) or an already-resolved pixel (px, used by the
  // pre-contact zone, which is not on the year axis at all).
  const pts = useMemo(() => (series || [])
    .filter(p => Number.isFinite(p.y) && (Number.isFinite(p.x) || Number.isFinite(p.px)))
    .map(p => [Number.isFinite(p.px) ? p.px : xOf(clampYear(p.x, span), span), yOf(p.y, band)])
    .sort((a, b) => a[0] - b[0]), [series, span, band])
  if (pts.length < 2) return null
  const d = smoothPath(pts)
  const baseY = yOf(baseline, band)
  const area = fill ? `${d} L ${pts[pts.length - 1][0]} ${baseY} L ${pts[0][0]} ${baseY} Z` : null
  const lit = state !== 'ambient'
  const stroke = w => (
    <path d={d} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray={dash || undefined} filter={lit && glowId ? `url(#${glowId})` : undefined} />
  )
  if (!nearMask) {
    return (
      <g className={`sc-line sc-${state}`} style={{ opacity: OPACITY[state] }}>
        {area && <path d={area} fill={color} className="sc-area" />}
        {stroke(STROKE[state])}
      </g>
    )
  }
  return (
    <g className={`sc-line sc-${state}`}>
      <g className="sc-far" style={{ opacity: DISTANT[state] }}>{stroke(STROKE[state] * 0.75)}</g>
      <g className="sc-near" style={{ opacity: OPACITY[state] }} mask={`url(#${nearMask})`}>
        {area && <path d={area} fill={color} className="sc-area" />}
        {stroke(STROKE[state])}
      </g>
    </g>
  )
}

// ── LAYER 1 · THREADS, re-skinned ───────────────────────────────────────
// The subway map is retired here (BK has never liked it). Each thread becomes one wavy
// line rising and falling across the spine.
//
// Where the height comes from: Sam's signed stops, spread with a gaussian so a run of
// stops close together reads as a busy stretch and a long gap reads as a quiet one. Every
// thread is measured against the same ceiling, so two lines can honestly be compared.
// If Sam ever sends real per-era intensity, that replaces all of this — see intensityOf.
const yearOfStop = s => { const m = String(s?.when || '').match(/\d{4}/); return m ? +m[0] : null }
const linesOfStop = s => (s.on_lines ? [...new Set(s.on_lines.map(e => e.line))] : (Array.isArray(s.thread) ? s.thread : [s.thread])).filter(Boolean)

// LANES, and why a thread falls below its own line (BK, 2026-10-31: "the threads dont seem
// to fall below baseline .. doesn't fit with me visually against the highs and lows of a
// thread running along the timeline"). The first cut had every wave humping upward off one
// shared floor, which reads as mountains on a shelf. A thread is not a mountain range. Each
// one now rides its own resting line, spread down the band, and swings ABOVE it when the
// issue is contested and BELOW it when the country goes quiet on it — crossing its
// neighbours as it goes, the way BK's own reference image has them.
//
// A loud thread swings wider than a quiet one, so two lines can still be honestly compared:
// the swing is measured against that thread's own range but scaled by how loud it is next to
// the loudest thread in the course. A thread with no stops at all sits flat on its line —
// present, and truthfully saying nothing happened here yet.
const LANE_TOP = 0.84, LANE_BOT = 0.16, AMP = 0.23
const ampAt = c => Math.max(0.04, Math.min(AMP, 0.98 - c, c - 0.02))

function lanesFor(ids) {
  const n = ids.length
  const out = {}
  ids.forEach((id, i) => { out[id] = n < 2 ? 0.5 : LANE_TOP - i * ((LANE_TOP - LANE_BOT) / (n - 1)) })
  return out
}

// SIGMA is wide on purpose. A narrow kernel turns nineteen stops into nineteen isolated
// spikes sitting on a dead flat shelf, which is the thing BK objected to. A wide one reads
// the same stops as a swell — a stretch where the country kept coming back to this question,
// and a stretch where it went quiet — which is what the thread actually is. Centred on the
// thread's own average, so below the line means genuinely below its own normal.
// Rows of raw activity → curves riding their own lanes. Shared by both readings below, so
// a thread behaves the same whichever file it came from.
// `pre` is how many of the leading samples belong to the zone rather than the year axis.
// They are normalised with everything else — one reading, one scale — and only their
// placement differs: the zone spreads them evenly, because it is not a scale.
function rowsToLanes(xs, raw, lineIds, lanes, pre = 0) {
  let ceiling = 0
  for (const id of lineIds) if (raw[id]) ceiling = Math.max(ceiling, ...raw[id])
  if (!ceiling) return {}
  const out = {}
  for (const id of lineIds) {
    const row = raw[id]
    if (!row) continue
    const mean = row.reduce((a, v) => a + v, 0) / row.length
    const swing = Math.max(...row.map(v => Math.abs(v - mean))) || 1
    const loud = 0.35 + 0.65 * (Math.max(...row) / ceiling)
    const c = lanes[id], a = ampAt(c) * loud
    out[id] = xs.map((x, i) => {
      const y = c + a * ((row[i] - mean) / swing)
      return i < pre ? { px: zoneX(i, pre), y } : { x, y }
    })
  }
  return out
}
const axis = (span, steps) => Array.from({ length: steps + 1 }, (_, i) => span.from + (i * (span.to - span.from)) / steps)
// Notional years, never shown to anyone, used only so a pre-contact window Sam dates
// actually registers under the kernel. Their spacing is not a claim about anything.
const preAxis = span => (zoneOn(span) ? [span.from - 300, span.from - 210, span.from - 120, span.from - 40] : [])

// READING ONE, and the one in use: Sam's Regents Threads grounding document (handed over by
// BK 2026-10-31 13:08). Every era he dates becomes a window the thread is live across; every
// event he dates becomes a point. A window is a plateau with soft shoulders because an era is
// a stretch, not a spike. This is the first reading that covers the whole 1600–2026 span,
// because Sam's document does — the stops file only reaches as far as the course has taught.
function curvesFromGrounding(g, lineIds, span, lanes, { steps = 170, soft = 9, sigma = 11 } = {}) {
  const pre = preAxis(span)
  const xs = [...pre, ...axis(span, steps)]
  const raw = {}
  for (const id of lineIds) {
    const t = g?.threads?.[id]
    if (!t) continue
    raw[id] = xs.map(x => {
      let v = 0
      for (const [a, b] of t.windows || []) v += 0.5 * (Math.tanh((x - a) / soft) - Math.tanh((x - b) / soft))
      for (const y of t.events || []) v += 0.55 * Math.exp(-((x - y) ** 2) / (2 * sigma * sigma))
      return v
    })
  }
  return rowsToLanes(xs, raw, lineIds, lanes, pre.length)
}

// READING TWO, the fallback: the stops in Sam's signed threads file. Only reaches as far as
// the course has been taught, so it draws one swell and a long flat run — which is honest,
// and is why the grounding document above is preferred when it is on disk.
function derivedCurves(stops, lineIds, span, lanes, { steps = 140, sigma = 42 } = {}) {
  const xs = axis(span, steps)
  const raw = {}
  for (const id of lineIds) {
    const years = (stops || []).filter(s => linesOfStop(s).includes(id)).map(yearOfStop).filter(Boolean)
    raw[id] = xs.map(x => years.reduce((a, y) => a + Math.exp(-((x - y) ** 2) / (2 * sigma * sigma)), 0))
  }
  return rowsToLanes(xs, raw, lineIds, lanes)
}

// Sam's numbers if Sam has sent them; the reading of Sam's stops if not. Either way the
// thread ends up swinging around its own lane — Sam sends 0..1 for how contested the issue
// was, and 0.5 is that thread's ordinary.
function intensityOf(scene, ground, threadsData, span) {
  const lines = (threadsData?.lines || threadsData?.threads || [])
  const ids = lines.map(l => l.id)
  const lanes = lanesFor(ids)
  // 1 · Sam's own per-era intensity, if he ever sends it. Wins outright.
  const given = scene?.threads
  if (given && Object.keys(given).length) {
    const out = {}
    for (const id of ids) {
      const pts = given[id]
      if (!Array.isArray(pts) || pts.length < 2) continue
      const c = lanes[id], a = ampAt(c)
      out[id] = pts.map(p => ({ x: +p.year, y: c + a * ((Math.max(0, Math.min(1, +p.v)) - 0.5) * 2) }))
    }
    if (Object.keys(out).length) return { curves: out, lanes, lines, read: 'sam' }
  }
  // 2 · Sam's grounding document, read across the whole span.
  if (ground?.threads) {
    const out = curvesFromGrounding(ground, ids, span, lanes)
    if (Object.keys(out).length) return { curves: out, lanes, lines, read: 'ground' }
  }
  // 3 · The stops that are already live.
  return { curves: derivedCurves(threadsData?.stops || [], ids, span, lanes), lanes, lines, read: 'stops' }
}

// ── LAYER 2 · THE PLATFORM ──────────────────────────────────────────────
// Parties and presidents, a band across the spine showing who held power when. The
// renderer is here and ready; the eras themselves are Sam's to write and Danny's to
// clear, so until the file lands this draws nothing and its toggle says so.
//   platform.eras : [{ from, to, party, color?, label? }]
function PlatformBand({ eras, span, state, nearMask = null }) {
  if (!(eras || []).length) return null
  const segs = (
    <>
      {eras.map((e, i) => {
        const x0 = xOf(clampYear(+e.from, span), span)
        const x1 = xOf(clampYear(+e.to, span), span)
        if (!(x1 > x0)) return null
        return (
          <g key={`${e.party}-${e.from}-${i}`}>
            <rect x={x0} y={PLAT_TOP} width={x1 - x0} height={PLAT_H} rx={3} fill={e.color || 'var(--arena-gold)'} className="sc-plat-seg" />
            {x1 - x0 > 54 && (
              <text x={(x0 + x1) / 2} y={PLAT_TOP + PLAT_H - 6} textAnchor="middle" className="sc-plat-label">{e.label || e.party}</text>
            )}
          </g>
        )
      })}
    </>
  )
  // The band obeys the same distance rule as the waves: the years the class has not reached
  // are there, and standing back.
  if (!nearMask) return <g className={`sc-platform sc-${state}`} style={{ opacity: OPACITY[state] }}>{segs}</g>
  return (
    <g className={`sc-platform sc-${state}`}>
      <g style={{ opacity: DISTANT[state] }}>{segs}</g>
      <g style={{ opacity: OPACITY[state] }} mask={`url(#${nearMask})`}>{segs}</g>
    </g>
  )
}

// ── THE SURFACE · TRANSPORTATION ────────────────────────────────────────
// Always on, never a toggle. Horse and wagon through the train, the first cars, the
// highway, the jet and up. Gold on navy, generic shapes, nothing with a badge on it.
// FIRST-PASS ART, drawn in paths so it ships without an asset round: BK's brief puts
// this down as an art-production job, not an engineering one, and says it is his call
// whether the real imagery is in the first build or a later polish pass. Every shape
// below is swappable for a picture without touching the mechanism.
const RIDES = [
  { year: 1620, w: 84, draw: 'ship' },
  { year: 1800, w: 104, draw: 'wagon' },
  { year: 1850, w: 104, draw: 'train' },
  { year: 1912, w: 76, draw: 'auto' },
  { year: 1958, w: 78, draw: 'highway' },
  { year: 1985, w: 84, draw: 'jet' },
  { year: 2015, w: 58, draw: 'rocket' },
]

// Each shape is drawn in a 0..100 wide, 0..60 tall box standing on y=60. Wheels are
// centred so they sit ON the road line, not half through it.
const SHAPES = {
  // a sailing ship: hull, mast, main sail and jib
  ship: 'M8 44 h84 l-11 12 h-62 Z M47 6 h5 v38 h-5 Z M53 11 L79 42 L53 42 Z M45 15 L23 42 L45 42 Z',
  // a draft horse pulling a covered wagon — the canopy is the tell, so it stands well
  // clear of the body and the rear wheel is bigger than the front, as they were
  wagon: 'M5 44 h4 v16 h-4 Z M13 44 h4 v16 h-4 Z M22 44 h4 v16 h-4 Z M29 44 h4 v16 h-4 Z'
       + ' M4 40 a15 8 0 0 1 30 0 a15 8 0 0 1 -30 0 Z M27 38 L32 21 L41 19 L44 26 L36 30 L34 40 Z M6 34 L1 25 L4 43 Z'
       + ' M30 46 h10 v3 h-10 Z M37 41 h56 v10 h-56 Z M41 41 a24 19 0 0 1 48 0 Z'
       + ' M52 53 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0 M84 51 m-9 0 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0',
  // a steam locomotive facing the way the century is going: cab, boiler, stack, cowcatcher
  train: 'M8 16 h30 v30 h-30 Z M38 28 h46 v18 h-46 Z M73 12 h10 v16 h-10 Z M71 10 h14 v5 h-14 Z'
       + ' M56 24 a7 4 0 0 1 14 0 Z M84 46 L96 58 L84 58 Z M6 46 h82 v4 h-82 Z'
       + ' M22 51 m-9 0 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0 M46 51 m-9 0 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0'
       + ' M68 53 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0'
       + ' M86 8 m-6 0 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 M96 16 m-4 0 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0',
  // the first cars: tall, boxy, a greenhouse you sat upright in
  auto: 'M30 15 h38 v6 h-38 Z M34 21 h28 v19 h-28 Z M16 40 h62 v11 h-62 Z M78 32 h8 v8 h-8 Z'
      + ' M30 51 m-9 0 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0 M70 51 m-9 0 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0',
  // the highway years: long, low, going somewhere
  highway: 'M31 27 L63 27 L72 41 L22 41 Z M8 41 h84 v10 h-84 Z'
         + ' M28 52 m-8 0 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0 M72 52 m-8 0 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0',
  // a jet: fuselage, swept wing, tail
  jet: 'M8 32 h72 q16 1 20 8 q-4 7 -20 8 h-72 q-7 -8 0 -16 Z M36 46 L16 60 L32 60 L54 46 Z M12 32 L5 10 L15 10 L26 32 Z',
  // and up
  rocket: 'M50 0 C63 15 67 32 67 44 H33 C33 32 37 15 50 0 Z M33 33 L20 54 L33 48 Z M67 33 L80 54 L67 48 Z M41 46 L50 60 L59 46 Z',
}

// Year-anchored, then nudged apart. These are scenery, not data points: a jet and a
// highway 27 years apart would otherwise sit on top of each other at this scale.
function layoutRides(span) {
  const L = zoneOn(span) ? PAD_L + ZONE_W + 18 : 8, R = W - 8
  const r = RIDES.map(d => ({ ...d, x: xOf(clampYear(d.year, span), span) }))
  for (let i = 1; i < r.length; i++) {
    const need = (r[i - 1].w + r[i].w) / 2 + 12
    if (r[i].x - r[i - 1].x < need) r[i].x = r[i - 1].x + need
  }
  const over = (r[r.length - 1].x + r[r.length - 1].w / 2) - R
  if (over > 0) for (const d of r) d.x -= over
  const under = L - (r[0].x - r[0].w / 2)
  if (under > 0) for (const d of r) d.x += under
  return r
}

const BAND_TOP = ROAD_TOP - 10

// A painted panel of the surface. The art is placed by its GROUND LINE, not by its box:
// each picture is scaled so its own horizon lands exactly on the road line and then clipped
// to the band. Gemini does not put the horizon in the same place twice — these came back at
// 74% and 81% down the frame — and cropping could not fix it, because the sources are barely
// taller than the slot. Positioning by the horizon costs nothing and the seams land true.
// FEATHER, and why: every panel came back with its own soft glow in the middle of its sky,
// so butted edge to edge they read as a row of lit boxes with visible joins. The panels now
// overlap and fade into each other across FEATHER pixels, which costs nothing and makes the
// surface continuous. Outer edges stay hard — there is nothing beyond them to blend into.
const FEATHER = 26
function SurfacePanel({ x0, x1, src, ground, ar = 900 / 503, id, soft = 'both' }) {
  const slotW = x1 - x0
  // Big enough to fill the band's height AND the slot's width — whichever needs more.
  // Height alone left bare gaps either side of the last panel, where its slot is widest.
  const dispW = Math.max(((ROAD_BASE - BAND_TOP) / ground) * ar, slotW)
  const dispH = dispW / ar
  const f = Math.min(FEATHER, slotW / 3) / slotW
  const l = soft === 'both' || soft === 'left', r = soft === 'both' || soft === 'right'
  return (
    <g>
      <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor={l ? '#000' : '#fff'} />
        <stop offset={f} stopColor="#fff" />
        <stop offset={1 - f} stopColor="#fff" />
        <stop offset="1" stopColor={r ? '#000' : '#fff'} />
      </linearGradient>
      <mask id={`${id}-m`} maskUnits="userSpaceOnUse" x={x0} y={BAND_TOP} width={slotW} height={H - BAND_TOP}>
        <rect x={x0} y={BAND_TOP} width={slotW} height={H - BAND_TOP} fill={`url(#${id}-g)`} />
      </mask>
      <g mask={`url(#${id}-m)`}>
        <image href={src} x={x0 + (slotW - dispW) / 2} y={ROAD_BASE - ground * dispH}
               width={dispW} height={dispH} preserveAspectRatio="none" />
      </g>
    </g>
  )
}

// `surface` is a list of painted panels from the manifest. With none configured the drawn
// shapes below still run, so the room never waits on an asset round — same rule Throwback
// keeps: a missing picture is never a broken frame.
function TransportSurface({ span, surface }) {
  const rides = useMemo(() => layoutRides(span), [span])
  const panels = (surface || []).filter(p => p.src && Number.isFinite(+p.ground))
  return (
    <g className="sc-road" aria-hidden="true">
      <rect x={0} y={BAND_TOP} width={W} height={H - BAND_TOP} fill="url(#sc-dawn)" />
      {panels.length
        ? panels.map((p, i) => {
            const last = i === panels.length - 1
            // The run reaches both ends of the stage; interior edges overlap so they can fade.
            const x0 = i === 0 ? axisL(span) : xOf(clampYear(+p.from, span), span) - FEATHER
            const x1 = last ? W : xOf(clampYear(+p.to, span), span) + FEATHER
            const soft = panels.length === 1 ? 'none' : i === 0 ? 'right' : last ? 'left' : 'both'
            return <SurfacePanel key={p.src} id={`sc-surf-${i}`} src={p.src} ground={+p.ground} ar={+p.ar || undefined}
                                 x0={x0} x1={x1} soft={soft} />
          })
        : rides.map(r => {
            const s = r.w / 100
            return (
              <g key={r.draw} transform={`translate(${r.x - r.w / 2} ${ROAD_BASE - 60 * s}) scale(${s})`}>
                <path d={SHAPES[r.draw]} className="sc-ride" />
              </g>
            )
          })}
      <line x1={0} x2={W} y1={ROAD_BASE} y2={ROAD_BASE} className="sc-road-line" />
    </g>
  )
}

// ── THE SPINE ───────────────────────────────────────────────────────────
// The one thing that is always there. Ticks every 25 years, a number every 50, and a
// gold marker on every Throwback era — open ones are buttons, the rest say "not yet"
// rather than vanishing, so the shape of the course stays visible (Throwback's own rule).
// The zone before contact. It is a place, not a span of the axis: its own ground, its own
// edge, no ticks, and it says out loud that it is not to scale. Tapping it opens its card,
// which is a Throwback era like any other (BK agreed 2026-10-31 15:34) — so the room still
// has exactly one gesture that changes depth, and the card goes through Danny the same way
// every other card does. Until that era exists the zone is simply a place, not a button.
function BeforeZone({ span, onOpen, hasCard, image }) {
  if (!zoneOn(span)) return null
  const x1 = PAD_L + ZONE_W, top = WAVE_TOP - 26, bot = ROAD_BASE
  const act = e => { if (hasCard && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onOpen() } }
  return (
    <g className={`sc-zone${hasCard ? ' live' : ''}`}
       role={hasCard ? 'button' : 'img'} tabIndex={hasCard ? 0 : -1}
       aria-label={hasCard ? SCENE_WORDS.zoneOpen : SCENE_WORDS.zoneShut}
       onClick={hasCard ? onOpen : undefined} onKeyDown={act}>
      <rect x={PAD_L} y={top} width={ZONE_W} height={bot - top} rx={9} className="sc-zone-bg" />
      {/* The vista sits in the surface band, the same height as every other panel — a
          118-wide, 456-tall box is a shape no landscape survives, and the picture gets
          seen properly in the card anyway, which is what the card is for. */}
      {image?.src && Number.isFinite(+image.ground) && (
        <SurfacePanel id="sc-zone-surf" src={image.src} ground={+image.ground} ar={+image.ar || undefined}
                      x0={0} x1={PAD_L + ZONE_W} soft="none" />
      )}
      <rect x={PAD_L} y={top} width={ZONE_W} height={bot - top} rx={9} className="sc-zone-edge" />
      <line x1={x1 + 9} x2={x1 + 9} y1={top} y2={bot} className="sc-zone-split" />
      <text x={PAD_L + ZONE_W / 2} y={SPINE_Y + 24} textAnchor="middle" className="sc-zone-label">{SCENE_WORDS.beforeContact}</text>
      <text x={PAD_L + ZONE_W / 2} y={SPINE_Y + 40} textAnchor="middle" className="sc-zone-sub">{SCENE_WORDS.notToScale}</text>
    </g>
  )
}

function Spine({ span, eras, opacity, onOpenYear, year }) {
  const ticks = useMemo(() => {
    const out = []
    const first = Math.ceil(span.from / 25) * 25
    for (let y = first; y <= span.to; y += 25) out.push(y)
    return out
  }, [span])
  return (
    <g className="sc-spine" style={{ opacity }}>
      <line x1={axisL(span)} x2={W - PAD_R} y1={SPINE_Y} y2={SPINE_Y} className="sc-rail" />
      {ticks.map(y => (
        <g key={y}>
          <line x1={xOf(y, span)} x2={xOf(y, span)} y1={SPINE_Y - 6} y2={SPINE_Y + 6} className={`sc-tick${y % 50 === 0 ? ' big' : ''}`} />
          {y % 50 === 0 && <text x={xOf(y, span)} y={SPINE_Y + 24} textAnchor="middle" className="sc-tick-n">{y}</text>}
        </g>
      ))}
      {(eras || []).map(e => {
        const x = xOf(clampYear(+e.year, span), span)
        const on = e.open
        const here = String(e.year) === String(year)
        const act = ev => { if (on && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); onOpenYear(String(e.year)) } }
        return (
          <g key={e.id || e.year} className={`sc-era${on ? '' : ' shut'}${here ? ' here' : ''}`}
             role={on ? 'button' : 'img'} tabIndex={on ? 0 : -1} aria-disabled={on ? undefined : true}
             aria-label={on ? SCENE_WORDS.openYear(e.year) : SCENE_WORDS.shutYear(e.year)}
             onClick={() => on && onOpenYear(String(e.year))} onKeyDown={act}>
            <circle cx={x} cy={SPINE_Y} r={11} className="sc-era-hit" />
            <circle cx={x} cy={SPINE_Y} r={on ? 7 : 5} className="sc-era-dot" />
            <text x={x} y={SPINE_Y - 18} textAnchor="middle" className="sc-era-n">{e.year}</text>
            {!on && <text x={x} y={SPINE_Y - 34} textAnchor="middle" className="sc-era-off">{SCENE_WORDS.notYet}</text>}
          </g>
        )
      })}
    </g>
  )
}

// ── DATA ────────────────────────────────────────────────────────────────
// Each layer's file is fetched on its own and a layer whose file is missing simply says
// it isn't here yet. One desk being late never blanks the room.
function useJson(ref) {
  const [data, setData] = useState(null)
  useEffect(() => {
    if (!ref) { setData(false); return }
    let live = true
    fetch(`/${String(ref).replace(/^\//, '')}`).then(r => (r.ok ? r.json() : null))
      .then(d => { if (live) setData(d || false) }).catch(() => live && setData(false))
    return () => { live = false }
  }, [ref])
  return data
}

export function useScene(course, preview = false) {
  const sc = course?.scene
  const live = sc?.published === true || preview
  const platform = useJson(live ? sc?.content_refs?.platform : null)
  const ground = useJson(live ? sc?.content_refs?.threads_scene : null)
  const threads = useThreads(live ? (course?.threads || [])[0]?.content_ref : null)
  return { platform, ground, threads, taughtThrough: sc?.taught_through || null,
           preContactId: sc?.pre_contact_era || null, zoneImage: sc?.zone_image || null,
           surface: sc?.surface || null,
           span: sc?.span || { from: 1600, to: new Date().getFullYear() } }
}

// ── THE ROOM ────────────────────────────────────────────────────────────
export function SceneView({ course, courseKey, scene, tbData, unitNumbers, year, onOpenYear, layers, onLayers }) {
  const { platform, ground, threads, taughtThrough, preContactId, zoneImage, surface, span } = scene
  const band = { top: WAVE_TOP, bottom: WAVE_BOT }

  const { curves, lanes, lines, read } = useMemo(
    () => intensityOf(platform || null, ground || null, threads || null, span), [platform, ground, threads, span])

  // A Throwback era is open when its own file says so, or when it belongs to a unit the
  // class has reached — Throwback's rule, read here rather than re-decided.
  const eras = useMemo(() => ((tbData?.eras) || []).map(e => ({
    id: e.id, year: e.year,
    open: e.status === 'open' || (e.unit && (unitNumbers || []).includes(String(e.unit))),
  })), [tbData, unitNumbers])

  // HOW FAR THE CLASS HAS GOT, which is where "near" ends and "the distance" begins. The
  // manifest can state it outright; otherwise it is the last Throwback era a kid can open,
  // which moves on its own as Sam files each unit's era. No third source and no guessing:
  // if neither exists the whole timeline is drawn near, which is the safe way to be wrong.
  const frontier = useMemo(() => {
    if (taughtThrough != null && Number.isFinite(+taughtThrough)) return +taughtThrough
    const open = eras.filter(e => e.open).map(e => +e.year).filter(Number.isFinite)
    return open.length ? Math.max(...open) : span.to
  }, [taughtThrough, eras, span])
  const fx = Math.max(0, Math.min(1, (xOf(clampYear(frontier, span), span)) / W))
  const receding = frontier < span.to - 1

  // The pre-contact card is a Throwback era with a slug instead of a year. If Sam has not
  // written it, or it is not open yet, the zone stays a place and does not pretend to be a
  // button — same rule as a shut era on the spine.
  const preContactCard = useMemo(() => {
    if (!preContactId) return null
    const e = ((tbData?.eras) || []).find(x => String(x.id) === String(preContactId))
    const open = e && (e.status === 'open' || (e.unit && (unitNumbers || []).includes(String(e.unit))))
    return open ? String(e.id) : null
  }, [tbData, preContactId, unitNumbers])

  // Every toggle in the room, in the order they sit under the timeline.
  const registry = useMemo(() => {
    const out = [
      { id: 'platform', kind: 'platform', label: 'The Platform', color: 'var(--arena-gold)', ready: !!(platform?.eras || []).length },
    ]
    for (const l of lines) out.push({ id: l.id, kind: 'thread', label: `${l.number} · ${l.name}`, color: THREAD_COLOR[l.id] || 'var(--arena-white)', ready: !!curves[l.id] })
    return out
  }, [platform, lines, curves])

  // THE GHOSTING. `on` is an ordered stack: the last one switched on is the one in front.
  // Switch one off and the one under it takes the front again. Nothing leaves the room.
  const on = useMemo(() => (layers || []).filter(id => registry.some(r => r.id === id && r.ready)), [layers, registry])
  const fore = on[on.length - 1] || null
  const stateOf = id => (id === fore ? 'fore' : on.includes(id) ? 'on' : 'ambient')
  const toggle = id => onLayers(on.includes(id) ? on.filter(x => x !== id) : [...on, id])

  // The spine goes translucent as the stack grows, and stops there — it is still the
  // thing every layer is measured against, and still the thing a kid taps.
  const spineOp = on.length ? Math.max(0.4, 1 - 0.2 * on.length) : 1

  // Drawn in depth order: everything at rest, then the spine, then whatever is switched
  // on, front-most last. Layers never take the pointer — the spine stays clickable through
  // all of them.
  const draw = (r, state) => {
    if (r.kind === 'thread') {
      return <LineOnSpine key={r.id} series={curves[r.id]} span={span} band={band} color={r.color}
                          state={state} fill={state === 'fore'} baseline={lanes[r.id]} glowId="sc-glow"
                          nearMask={receding ? 'sc-near' : null} />
    }
    return <PlatformBand key={r.id} eras={platform?.eras} span={span} state={state}
                         nearMask={receding ? 'sc-near' : null} />
  }

  const resting = registry.filter(r => r.ready && !on.includes(r.id))
  const lifted = on.map(id => registry.find(r => r.id === id)).filter(Boolean)

  // ON A PHONE the stage scrolls sideways, and a kid who lands on it is looking at 1600 —
  // four hundred years to the left of anything their class has touched. So on a narrow
  // screen it puts the frontier in view on arrival. Only on arrival, and only when the stage
  // actually overflows: it never fights a kid who has started scrolling.
  //
  // THIS HOOK LIVES ABOVE THE LOADING GUARD ON PURPOSE. It sat below it once, which made it
  // a conditional hook, and React tore the whole room down on first paint. Every hook in this
  // component runs before the first early return, and it stays that way. — Josh, 2026-10-31
  const stageRef = useRef(null)
  useEffect(() => {
    const el = stageRef.current
    if (!el || !receding) return
    const over = el.scrollWidth - el.clientWidth
    if (over > 8) el.scrollLeft = Math.max(0, Math.min(over, fx * el.scrollWidth - el.clientWidth * 0.62))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receding, fx, curves])

  if (threads === null && platform === null) return <div className="loading">{SCENE_WORDS.opening}</div>

  return (
    <div className="scene">
      <div className="sc-stage" ref={stageRef}>
        <svg viewBox={`0 0 ${W} ${H}`} className="sc-svg" role="img" aria-label={SCENE_WORDS.spineLabel}>
          <defs>
            <linearGradient id="sc-dawn" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#0B1220" /><stop offset="0.72" stopColor="#13203A" /><stop offset="1" stopColor="#2A2A3F" />
            </linearGradient>
            <filter id="sc-glow" x="-20%" y="-60%" width="140%" height="220%">
              <feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            {/* Near ends, and the distance begins, where the course has got to. */}
            <linearGradient id="sc-near-grad" gradientUnits="objectBoundingBox" x1="0" y1="0" x2="1" y2="0">
              <stop offset={Math.max(0, fx - 0.07)} stopColor="#fff" />
              <stop offset={Math.min(1, fx + 0.015)} stopColor="#000" />
            </linearGradient>
            <mask id="sc-near" maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
              <rect x="0" y="0" width={W} height={H} fill="url(#sc-near-grad)" />
            </mask>
          </defs>

          <TransportSurface span={span} surface={surface} />
          <BeforeZone span={span} image={zoneImage} hasCard={!!preContactCard}
                      onOpen={() => onOpenYear(preContactCard)} />
          {/* Where the course has got to. Labelled on BK's call, 2026-10-31 14:30; the label
              sits on the taught side of the line, because that is the side it is describing. */}
          {receding && (() => {
            const fxp = xOf(clampYear(frontier, span), span)
            const left = fx > 0.2
            return (
              <g className="sc-frontier-g">
                <line className="sc-frontier" x1={fxp} x2={fxp} y1={WAVE_TOP - 16} y2={SPINE_Y} />
                <text className="sc-frontier-t" x={fxp + (left ? -9 : 9)} y={WAVE_TOP - 20}
                      textAnchor={left ? 'end' : 'start'}>{SCENE_WORDS.frontier}</text>
              </g>
            )
          })()}
          <g className="sc-layers" style={{ pointerEvents: 'none' }}>{resting.map(r => draw(r, 'ambient'))}</g>
          <Spine span={span} eras={eras} opacity={spineOp} onOpenYear={onOpenYear} year={year} />
          <g className="sc-layers" style={{ pointerEvents: 'none' }}>{lifted.map(r => draw(r, stateOf(r.id)))}</g>
        </svg>
      </div>

      <div className="sc-controls">
        <div className="sc-controls-head">
          <p className="sc-controls-title">{SCENE_WORDS.layersLabel}</p>
          <p className="sc-controls-hint">{SCENE_WORDS.layersHint}</p>
        </div>
        <div className="sc-toggles">
          {registry.filter(r => r.kind !== 'thread').map(r => (
            <Toggle key={r.id} r={r} on={on.includes(r.id)} fore={fore === r.id} onClick={() => toggle(r.id)} />
          ))}
        </div>
        {registry.some(r => r.kind === 'thread') && (
          <>
            <p className="sc-group">{SCENE_WORDS.threadsGroup}</p>
            <div className="sc-toggles">
              {registry.filter(r => r.kind === 'thread').map(r => (
                <Toggle key={r.id} r={r} on={on.includes(r.id)} fore={fore === r.id} onClick={() => toggle(r.id)} />
              ))}
            </div>
          </>
        )}
        {on.length > 0
          ? <button type="button" className="sc-clear" onClick={() => onLayers([])}>{SCENE_WORDS.clear}</button>
          : <p className="sc-rest">{SCENE_WORDS.restNote}</p>}
        {/* The note that used to sit here explained where the thread heights come from. It
            was a desk note that had leaked into the student view and it said a desk's name
            out loud to kids, so it is gone (Josh flagged it, BK 2026-10-31 14:30). The same
            account now lives where it belongs: the manifest's scene._note, and the method is
            written out in full inside scene-threads-us11r.json. Nothing was lost but the leak. */}
      </div>
    </div>
  )
}

// A toggle names its layer in words and carries its colour as a swatch — the colour is
// never the only thing telling two layers apart (§7.5).
function Toggle({ r, on, fore, onClick }) {
  return (
    <button type="button" className={`sc-toggle${on ? ' on' : ''}${fore ? ' fore' : ''}${r.ready ? '' : ' coming'}`}
            style={{ '--c': r.color }} aria-pressed={r.ready ? on : undefined} disabled={!r.ready}
            onClick={r.ready ? onClick : undefined}
            title={r.ready ? undefined : SCENE_WORDS.comingHint}>
      <span className="sc-swatch" aria-hidden="true" />
      <span className="sc-toggle-label">{r.label}</span>
      {!r.ready && <span className="sc-coming">{SCENE_WORDS.comingTag}</span>}
    </button>
  )
}

export const SCENE_STYLES = `
.scene{margin-top:10px}
.sc-stage{background:var(--arena-canvas);border:1px solid var(--arena-edge);border-radius:12px;overflow:hidden;box-shadow:var(--arena-lift)}
.sc-svg{display:block;width:100%;height:auto}

/* the surface */
.sc-road-line{stroke:var(--arena-gold);stroke-width:1.5;opacity:.45}
.sc-ride{fill:var(--arena-gold);opacity:.3}

/* the spine */
.sc-spine{transition:opacity .45s ease}
.sc-rail{stroke:var(--arena-white);stroke-width:2.5;stroke-linecap:round}
.sc-tick{stroke:var(--arena-grey);stroke-width:1}
.sc-tick.big{stroke:var(--arena-white);stroke-width:1.6}
.sc-tick-n{fill:var(--arena-grey);font-size:12px;font-weight:600;letter-spacing:.02em}
.sc-era{cursor:pointer}
.sc-era-hit{fill:transparent}
.sc-era-dot{fill:var(--arena-gold);stroke:var(--arena-canvas);stroke-width:2;transition:r .2s ease}
.sc-era-n{fill:var(--arena-gold);font-size:13px;font-weight:700}
.sc-era.here .sc-era-dot{fill:var(--arena-gold-lit)}
.sc-era.here .sc-era-n{fill:var(--arena-gold-lit)}
.sc-era:hover .sc-era-dot,.sc-era:focus-visible .sc-era-dot{fill:var(--arena-gold-lit);r:9}
.sc-era:focus-visible{outline:none}
.sc-era:focus-visible .sc-era-hit{fill:none;stroke:var(--arena-gold-lit);stroke-width:2}
.sc-era.shut{cursor:default}
.sc-era.shut .sc-era-dot{fill:var(--arena-grey-dim)}
.sc-era.shut .sc-era-n{fill:var(--arena-grey-dim)}
.sc-era-off{fill:var(--arena-grey-dim);font-size:10px;letter-spacing:.04em;text-transform:uppercase}

/* the layers */
.sc-line{transition:opacity .5s ease}
.sc-line .sc-far,.sc-line .sc-near{transition:opacity .5s ease}
/* the zone before contact */
.sc-zone-bg{fill:#0E1A2C}
.sc-zone-img{opacity:.62}
.sc-zone-edge{fill:none;stroke:var(--arena-edge);stroke-width:1}
.sc-zone-split{stroke:var(--arena-edge);stroke-width:1;stroke-dasharray:3 6;opacity:.6}
.sc-zone-label{fill:var(--arena-white);font-size:12px;font-weight:700;letter-spacing:.02em}
.sc-zone-sub{fill:var(--arena-grey-dim);font-size:9.5px;letter-spacing:.06em;text-transform:uppercase}
.sc-zone.live{cursor:pointer}
.sc-zone.live:hover .sc-zone-edge,.sc-zone.live:focus-visible .sc-zone-edge{stroke:var(--arena-gold-lit);stroke-width:2}
.sc-zone.live:hover .sc-zone-img{opacity:.8}
.sc-zone:focus-visible{outline:none}
.sc-frontier{stroke:var(--arena-gold);stroke-width:1.25;stroke-dasharray:2 7;opacity:.45}
.sc-frontier-t{fill:var(--arena-gold);font-size:12.5px;font-weight:700;letter-spacing:.04em;opacity:.85}
.sc-line .sc-area{opacity:.12}
.sc-plat-seg{opacity:.85}
.sc-plat-label{fill:var(--arena-canvas);font-size:10px;font-weight:700;letter-spacing:.03em}
.sc-platform{transition:opacity .5s ease}

/* the controls */
.sc-controls{margin-top:14px}
.sc-controls-title{margin:0;font-weight:700;color:var(--arena-white)}
.sc-controls-hint{margin:2px 0 10px;color:var(--arena-grey);font-size:.92rem}
.sc-group{margin:14px 0 8px;color:var(--arena-grey);font-size:.82rem;letter-spacing:.06em;text-transform:uppercase}
.sc-toggles{display:flex;flex-wrap:wrap;gap:8px}
.sc-toggle{display:inline-flex;align-items:center;gap:8px;padding:8px 13px;border-radius:999px;cursor:pointer;
  background:var(--arena-card);border:1px solid var(--arena-edge);color:var(--arena-white);font:inherit;font-size:.9rem;
  transition:background .2s ease,border-color .2s ease,transform .1s ease}
.sc-toggle:hover:not(:disabled){background:var(--arena-card-lit)}
.sc-toggle:active:not(:disabled){transform:translateY(1px)}
.sc-toggle:focus-visible{outline:2px solid var(--arena-gold-lit);outline-offset:2px}
.sc-toggle.on{border-color:var(--c);background:var(--arena-card-lit)}
.sc-toggle.fore{box-shadow:0 0 0 1px var(--c) inset,0 0 12px rgba(227,179,65,.18)}
.sc-toggle.coming{opacity:.55;cursor:default}
.sc-swatch{width:12px;height:12px;border-radius:3px;background:var(--c);flex:0 0 auto}
.sc-toggle.on .sc-swatch{box-shadow:0 0 8px var(--c)}
.sc-coming{font-size:.72rem;letter-spacing:.06em;text-transform:uppercase;color:var(--arena-grey-dim)}
.sc-clear{margin-top:12px;background:none;border:1px solid var(--arena-edge);color:var(--arena-grey);
  border-radius:8px;padding:6px 12px;cursor:pointer;font:inherit;font-size:.86rem}
.sc-clear:hover{color:var(--arena-white);border-color:var(--arena-white)}
.sc-rest{margin:12px 0 0;color:var(--arena-grey);font-size:.88rem;max-width:62ch}
.sc-derived{margin:10px 0 0;color:var(--arena-grey-dim);font-size:.8rem;max-width:70ch}

@media (max-width:640px){
  .sc-stage{overflow-x:auto}
  .sc-svg{min-width:720px}
  .sc-toggle{font-size:.84rem;padding:7px 11px}
}
@media (prefers-reduced-motion:reduce){
  .sc-line,.sc-spine,.sc-platform,.sc-toggle{transition:none}
}
`
