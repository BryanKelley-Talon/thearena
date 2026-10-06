// ============================================================
// THE ATLAS — maps by unit, in both doors (Leo's order 2026-10-05 21:07; BK 21:11 "yes to all three").
//
// BK, 10/3 02:24: "...ended up having to freehand draw a map on the board because I didn't have
// a map at the ready." So it is classroom first: a fast open, full screen on the projector, zoom
// and pan, and type you can read from the back row. It still plays on a phone and a Chromebook.
//
// One mechanic, two content feeds (US from Sam, Global from Will), the Writing Lab's split.
// Each map can come alive three ways, all drawn from sourced files the desk supplies:
//   • Layers      — toggled overlays (rivers, resources, trade routes): why a place sits where it does.
//   • Then → Now  — a slider that crossfades registered maps of the same ground over time.
//   • Routes      — a path that draws itself across the map (reduced motion: it simply appears).
// And a walk (BK 21:14: "show how to breakdown a map, what to look for"): Read this map steps
// through the desk's map-reading moves, gliding to and outlining the part each step is about.
// Josh animates; he never draws geography. Every picture on screen shows its source line.
//
// The rules this file keeps:
//   • The desks own every word a student reads on a map card and in the viewer.
//     The few words this file adds (Maps, Open, the viewer buttons) went to BK first (21:13).
//   • Nothing is stored and nothing is sent. A map is a reference, not a test.
//   • Colour never carries meaning alone: a layer toggle says its name and shows a check;
//     a route is named in words.
//   • Keyboard: + and − zoom, arrows pan, 0 resets, F goes full screen, Esc closes.
//     Tab stays inside the viewer while it is open.
// ============================================================
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RefButtons } from './refcards.jsx'

// Proof builds (VITE_ATLAS_PROOF=1) read the placeholder file copied into dist/_proof/.
// A production build never sees it: the files live outside public/.
const PROOF = import.meta.env.VITE_ATLAS_PROOF === '1'

export const ATLAS_WORDS = {
  section: 'Atlas',
  // BK 21:53 ("4. yes"): each unit gets its own atlas; a finished unit's card reads "11.1 Atlas · Colonial Foundations".
  unitAtlas: (n, title) => `${n} Atlas · ${title}`,
  intro: 'Every map from this unit. Tap one to open it big.',
  open: 'Open',
  fullscreen: 'Full screen',
  exitFullscreen: 'Full screen',   // the same button toggles; its pressed state says which
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  reset: 'Reset',
  close: 'Close',
  layers: 'Layers',
  thenNow: 'Then → Now',
  draw: 'Draw the route',
  drawAgain: 'Draw it again',
  source: 'Source:',
  openMap: 'Open the map',
  readMap: 'Read this map',
  back: 'Back',
  next: 'Next',
  done: 'Done',
}

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const assetUrl = p => (/^(https?:)?\//.test(p) ? p : `/${String(p).replace(/^\.?\//, '')}`)

// Every published map for a course, merged from its atlas files, in file order.
export function useAtlas(course) {
  const [maps, setMaps] = useState(null)
  useEffect(() => {
    if (!course) { setMaps(null); return }
    const refs = (course.atlas || []).filter(a => a.published === true)
    if (!refs.length) { setMaps([]); return }
    const urls = PROOF
      ? [`/_proof/atlas-${course.id}.json`]
      : refs.map(a => `/content/${String(a.content_ref).replace(/^content\//, '')}`)
    let live = true
    Promise.all(urls.map(u => fetch(u).then(r => (r.ok ? r.json() : null)).catch(() => null)))
      .then(files => {
        if (!live) return
        // A file's `walk` is the desk's generic map-reading steps; a map's own `walk` replaces it.
        const all = files.flatMap(f => (f?.maps || []).map(m => ({ ...m, walk: m.walk || f.walk || [] })))
        setMaps(all.filter(m => m.status === 'open'))
      })
    return () => { live = false }
  }, [course])
  return maps
}

export const mapsForUnit = (maps, unit) =>
  (maps || []).filter(m => unit && String(m.unit) === String(unit.number))

// ── A map card: the thumbnail, the desk's title and caption, and Open ─────────
export function MapCards({ maps, onOpen }) {
  return (
    <div className="grid room-cards atlas-grid">
      {maps.map(m => (
        <button key={m.id} type="button" className="card atlas-card" onClick={() => onOpen(m.id)}>
          <span className="atlas-thumb">
            <img src={assetUrl(m.thumb || m.image)} alt="" loading="lazy" decoding="async" />
          </span>
          <div className="card-name">{m.title}</div>
          <div className="card-blurb">{m.caption}</div>
          <span className="flag live">{ATLAS_WORDS.open}</span>
        </button>
      ))}
    </div>
  )
}

const unitTitle = u => String(u?.label || '').replace(/^\d+\.\d+\s*·\s*/, '')
export const unitAtlasName = u => ATLAS_WORDS.unitAtlas(u.number, unitTitle(u))

// ── The Atlas lane on the door (BK 21:28: "each unit gets their own atlas"): the atlas of the
// unit we're in, then one card per finished unit, newest first, opening that unit's atlas. ──
export function AtlasLane({ course, maps, currentUnit, unitName, onOpen, onOpenUnitAtlas, Empty }) {
  if (maps === null) return null
  const now = currentUnit
  const nowMaps = mapsForUnit(maps, now)
  const past = [...(course.units || [])].filter(u => u.slug !== now?.slug).reverse()
  return (
    <>
      {now && (
        <section className="atlas-unit">
          <p className="unit-now"><span className="unit-now-tag">Now</span> {unitAtlasName(now)}</p>
          {nowMaps.length
            ? <MapCards maps={nowMaps} onOpen={onOpen} />
            : <><span className="flag building atlas-flag">Under construction</span><Empty what="Maps" /></>}
        </section>
      )}
      {past.length > 0 && (
        <div className="grid atlas-units">
          {past.map(u => {
            const n = mapsForUnit(maps, u).length
            return (
              <button key={u.slug} type="button" className={`card${n ? '' : ' off'}`} disabled={!n} tabIndex={n ? 0 : -1}
                      onClick={() => n && onOpenUnitAtlas(u.slug)}>
                <div className="card-name">{unitAtlasName(u)}</div>
                {n ? <span className="flag live">{ATLAS_WORDS.open}</span>
                   : <span className="flag building">Under construction</span>}
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}

// ── One unit's atlas, on its own page (#/us/11.1/atlas) ──────────────────
export function UnitAtlasPage({ course, unit, maps, onOpen, onBack, ScreenHeader, BottomBack, Empty }) {
  const ms = mapsForUnit(maps, unit)
  return (
    <div className="wrap">
      <ScreenHeader label={unitAtlasName(unit)} onBack={onBack} color={course.accent} back={course.label} />
      <p className="lane-intro">{ATLAS_WORDS.intro}</p>
      {maps === null ? null : ms.length
        ? <MapCards maps={ms} onOpen={onOpen} />
        : <><span className="flag building atlas-flag">Under construction</span><Empty what="Maps" /></>}
      <BottomBack onBack={onBack} back={course.label} />
    </div>
  )
}

// ============================================================
// THE VIEWER
// ============================================================
const MIN_Z = 1, MAX_Z = 8
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export function AtlasViewer({ map, refs, onClose }) {
  const shell = useRef(null)
  const stage = useRef(null)
  const [nat, setNat] = useState(null)           // the base image's pixel size: every overlay is registered to it
  const [box, setBox] = useState({ w: 0, h: 0 })  // the stage's size on screen
  const [view, setView] = useState({ z: 1, x: 0, y: 0 })   // z = zoom over "fit"; x,y = pan in screen px
  const [on, setOn] = useState({})                // layer id → shown
  const [t, setT] = useState(0)                   // Then → Now position, 0 … steps-1 (fractional while it moves)
  const [drawn, setDrawn] = useState({})          // route id → run count (0 = not drawn)
  const [full, setFull] = useState(false)
  const [walkAt, setWalkAt] = useState(null)      // null = not walking; else the step index
  const [glide, setGlide] = useState(false)       // a programmatic move eases; a drag never does
  const walk = map.walk || []
  const anim = useRef(0)
  const still = reducedMotion()
  const steps = map.then_now || []
  const layers = map.layers || []
  const routes = map.routes || []
  const canFull = typeof document !== 'undefined' && !!document.documentElement.requestFullscreen

  // Fit the whole map in the stage at zoom 1.
  const fit = nat && box.w && box.h ? Math.min(box.w / nat.w, box.h / nat.h) : 1
  const scale = fit * view.z

  // Keep the map from sliding off: at least a quarter of the stage stays covered.
  // A walk step frames tighter: the map's edge stops at the stage's edge, so no dark gap opens beside a callout.
  const bound = useCallback((v, slack = 0.25) => {
    if (!nat) return v
    const w = nat.w * fit * v.z, h = nat.h * fit * v.z
    const mx = Math.max(0, (w - box.w) / 2 + (w > box.w ? box.w * slack : 0)), my = Math.max(0, (h - box.h) / 2 + (h > box.h ? box.h * slack : 0))
    return { z: v.z, x: clamp(v.x, -mx, mx), y: clamp(v.y, -my, my) }
  }, [nat, fit, box])

  // Zoom about a point on screen (the pointer, a pinch centre, or the middle for buttons).
  const zoomAt = useCallback((nz, cx, cy) => {
    setView(v => {
      const z = clamp(nz, MIN_Z, MAX_Z)
      const k = z / v.z
      const ox = (cx ?? box.w / 2) - box.w / 2, oy = (cy ?? box.h / 2) - box.h / 2
      return bound({ z, x: ox - (ox - v.x) * k, y: oy - (oy - v.y) * k })
    })
  }, [box, bound])
  const zoomBy = f => zoomAt(view.z * f)
  const reset = () => setView({ z: 1, x: 0, y: 0 })
  const glideView = v => {
    if (!still) { setGlide(true); clearTimeout(glideT.current); glideT.current = setTimeout(() => setGlide(false), 750) }
    setView(v)
  }
  const glideT = useRef(0)
  // Frame one part of the map ([x, y, w, h] in map pixels) so it fills most of the stage.
  const frame = f => {
    if (!nat || !f) { glideView({ z: 1, x: 0, y: 0 }); return }
    const [fx, fy, fw, fh] = f
    const z = clamp(Math.min(box.w / (fw * fit), box.h / (fh * fit)) * 0.55, MIN_Z, 4)
    glideView(bound({ z, x: -(fx + fw / 2 - nat.w / 2) * fit * z, y: -(fy + fh / 2 - nat.h / 2) * fit * z }, 0))
  }
  const goStep = i => { setWalkAt(i); if (i == null) glideView({ z: 1, x: 0, y: 0 }); else frame(walk[i]?.focus) }
  const focus = walkAt != null ? walk[walkAt]?.focus : null
  const pan = (dx, dy) => setView(v => bound({ ...v, x: v.x + dx, y: v.y + dy }))

  // The stage's size, kept current through rotation, full screen and resizes.
  useEffect(() => {
    const el = stage.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Pointer: drag to pan; two fingers pinch; double tap or double click zooms in.
  const pts = useRef(new Map())
  const pinch = useRef(null)
  const lastTap = useRef(0)
  const local = e => { const r = stage.current.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] }
  const onDown = e => {
    setGlide(false)
    stage.current.setPointerCapture?.(e.pointerId)
    pts.current.set(e.pointerId, local(e))
    if (pts.current.size === 2) {
      const [a, b] = [...pts.current.values()]
      pinch.current = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: view.z }
    }
    if (pts.current.size === 1) {
      const now = Date.now()
      if (now - lastTap.current < 300) { const [x, y] = local(e); zoomAt(view.z * 2, x, y); lastTap.current = 0 }
      else lastTap.current = now
    }
  }
  const onMove = e => {
    if (!pts.current.has(e.pointerId)) return
    const prev = pts.current.get(e.pointerId)
    const cur = local(e)
    pts.current.set(e.pointerId, cur)
    if (pts.current.size === 2 && pinch.current) {
      const [a, b] = [...pts.current.values()]
      const d = Math.hypot(a[0] - b[0], a[1] - b[1])
      zoomAt(pinch.current.z * (d / pinch.current.d), (a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
    } else if (pts.current.size === 1) {
      pan(cur[0] - prev[0], cur[1] - prev[1])
    }
  }
  const onUp = e => { pts.current.delete(e.pointerId); if (pts.current.size < 2) pinch.current = null }
  const onWheel = e => { e.preventDefault(); const [x, y] = local(e); zoomAt(view.z * Math.exp(-e.deltaY * 0.0015), x, y) }
  useEffect(() => {
    const el = stage.current
    if (!el) return
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  })

  // Full screen for the projector. iPhone Safari has no element full screen; the viewer
  // already fills the page there, so the button simply isn't offered.
  const toggleFull = () => {
    if (!canFull) return
    if (document.fullscreenElement) document.exitFullscreen?.()
    else shell.current?.requestFullscreen?.().catch(() => {})
  }
  useEffect(() => {
    const on = () => setFull(document.fullscreenElement === shell.current)
    document.addEventListener('fullscreenchange', on)
    return () => document.removeEventListener('fullscreenchange', on)
  }, [])

  // Then → Now: a tap on a step or an arrow key glides there; dragging moves freely.
  const glideTo = target => {
    cancelAnimationFrame(anim.current)
    if (still) { setT(target); return }
    const from = t, t0 = performance.now(), dur = 900
    const tick = now => {
      const k = clamp((now - t0) / dur, 0, 1)
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2
      setT(from + (target - from) * e)
      if (k < 1) anim.current = requestAnimationFrame(tick)
    }
    anim.current = requestAnimationFrame(tick)
  }
  useEffect(() => () => cancelAnimationFrame(anim.current), [])
  const stepNow = Math.round(t)

  // Keys, focus trap, the page behind kept still, and focus handed back on close.
  useEffect(() => {
    const back = document.activeElement
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    shell.current?.querySelector('.atlas-close')?.focus()
    const onKey = e => {
      if (e.target?.type === 'range') return   // the slider handles its own arrows
      const k = e.key
      if (k === 'Escape') { if (!document.fullscreenElement) { e.preventDefault(); onClose() } return }
      if (k === 'Tab') {
        const f = [...shell.current.querySelectorAll('button:not([disabled]), input, [tabindex="0"]')]
        if (!f.length) return
        const i = f.indexOf(document.activeElement)
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus() }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus() }
        return
      }
      if (e.target?.closest?.('.atlas-controls') && (k === ' ' || k === 'Enter')) return
      if (k === '+' || k === '=') { e.preventDefault(); zoomAt(viewRef.current.z * 1.5) }
      else if (k === '-' || k === '_') { e.preventDefault(); zoomAt(viewRef.current.z / 1.5) }
      else if (k === '0') { e.preventDefault(); reset() }
      else if (k === 'f' || k === 'F') { e.preventDefault(); toggleFull() }
      else if (k === 'ArrowLeft') { e.preventDefault(); pan(60, 0) }
      else if (k === 'ArrowRight') { e.preventDefault(); pan(-60, 0) }
      else if (k === 'ArrowUp') { e.preventDefault(); pan(0, 60) }
      else if (k === 'ArrowDown') { e.preventDefault(); pan(0, -60) }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      if (document.fullscreenElement) document.exitFullscreen?.()
      back?.focus?.()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const viewRef = useRef(view)
  viewRef.current = view

  // The source lines on screen right now: the map, every visible layer, the step in view, every drawn route.
  const sources = useMemo(() => {
    const out = []
    const add = (what, s) => { if (s && !out.some(o => o.s === s)) out.push({ what, s }) }
    if (steps.length) add(steps[stepNow]?.label, steps[stepNow]?.source)
    else add(null, map.source)
    for (const l of layers) if (on[l.id]) add(l.label, l.source)
    for (const r of routes) if (drawn[r.id]) add(r.label, r.source)
    if (steps.length) add(null, map.source)
    return out
  }, [map, steps, layers, routes, on, drawn, stepNow])

  const sw = nat ? Math.max(3, nat.w / 260) : 4      // route width in map pixels: readable at fit on a projector
  const hasControls = walk.length || layers.length || steps.length > 1 || routes.length

  return (
    <div className={`atlas-viewer${full ? ' is-full' : ''}`} ref={shell} role="dialog" aria-modal="true" aria-labelledby="atlas-title">
      <div className="atlas-bar">
        <h2 id="atlas-title" className="atlas-title">{map.title}</h2>
        <div className="atlas-tools" role="toolbar" aria-label="Map controls">
          {canFull && (
            <button type="button" className="atlas-btn" aria-pressed={full} onClick={toggleFull}>
              <span aria-hidden="true">⛶</span> <span className="atlas-lbl">{ATLAS_WORDS.fullscreen}</span>
            </button>
          )}
          <button type="button" className="atlas-btn" onClick={() => zoomBy(1 / 1.5)} disabled={view.z <= MIN_Z}>
            <span aria-hidden="true">−</span> <span className="atlas-lbl">{ATLAS_WORDS.zoomOut}</span>
          </button>
          <button type="button" className="atlas-btn" onClick={() => zoomBy(1.5)} disabled={view.z >= MAX_Z}>
            <span aria-hidden="true">+</span> <span className="atlas-lbl">{ATLAS_WORDS.zoomIn}</span>
          </button>
          <button type="button" className="atlas-btn" onClick={reset} disabled={view.z === 1 && !view.x && !view.y}>
            {ATLAS_WORDS.reset}
          </button>
          <button type="button" className="atlas-btn atlas-close" onClick={onClose}>
            <span aria-hidden="true">✕</span> {ATLAS_WORDS.close}
          </button>
        </div>
      </div>

      <div className={`atlas-body${hasControls ? ' with-controls' : ''}`}>
        <div className="atlas-stage" ref={stage}
             onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <div className="atlas-plane" style={{
            width: nat ? nat.w : 'auto', height: nat ? nat.h : 'auto',
            transform: `translate(-50%, -50%) translate(${view.x}px, ${view.y}px) scale(${scale})`,
            transition: glide ? 'transform .7s cubic-bezier(.45,0,.25,1)' : 'none',
            visibility: nat ? 'visible' : 'hidden',
          }}>
            <img className="atlas-img" src={assetUrl(map.image)} alt={map.image_alt} draggable="false"
                 onLoad={e => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })} />
            {steps.map((s, i) => (
              <img key={`s${i}`} className="atlas-img atlas-over" src={assetUrl(s.image)} alt={i === stepNow ? (s.image_alt || '') : ''}
                   aria-hidden={i === stepNow ? undefined : 'true'} draggable="false"
                   style={{ opacity: i === 0 ? 1 : clamp(t - (i - 1), 0, 1) }} />
            ))}
            {layers.map(l => (
              <img key={l.id} className={`atlas-img atlas-over atlas-layer${still ? ' still' : ''}`} src={assetUrl(l.image)} alt=""
                   aria-hidden="true" draggable="false" style={{ opacity: on[l.id] ? 1 : 0 }} />
            ))}
            {nat && (routes.length > 0 || focus) && (
              <svg className="atlas-img atlas-over" viewBox={`0 0 ${nat.w} ${nat.h}`} aria-hidden="true">
                <defs>
                  <marker id="atlas-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                    <path d="M0,0 L10,5 L0,10 z" fill="#E3B341" stroke="#0B1220" strokeWidth="1.2" />
                  </marker>
                </defs>
                {routes.map(r => drawn[r.id] ? (
                  <g key={`${r.id}-${drawn[r.id]}`} className={`atlas-route${still ? ' still' : ''}`}>
                    <path d={r.path} pathLength="1" fill="none" stroke="#0B1220" strokeWidth={sw * 2.2} strokeLinecap="round" strokeLinejoin="round" />
                    <path d={r.path} pathLength="1" fill="none" stroke="#E3B341" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
                          markerEnd="url(#atlas-arrow)" />
                  </g>
                ) : null)}
                {focus && (
                  <g className="atlas-focus">
                    <rect x={focus[0]} y={focus[1]} width={focus[2]} height={focus[3]} rx={sw * 2} fill="none" stroke="#0B1220" strokeWidth={sw * 2.4} />
                    <rect x={focus[0]} y={focus[1]} width={focus[2]} height={focus[3]} rx={sw * 2} fill="none" stroke="#F5CB63" strokeWidth={sw * 1.1} />
                  </g>
                )}
              </svg>
            )}
          </div>
        </div>

        {hasControls ? (
          <div className="atlas-controls">
            {walk.length > 0 && (
              <section className="atlas-walk" aria-live="polite">
                {walkAt == null ? (
                  <button type="button" className="btn-now atlas-walk-start" onClick={() => goStep(0)}>{ATLAS_WORDS.readMap}</button>
                ) : (
                  <>
                    <ol className="atlas-dots" aria-hidden="true">
                      {walk.map((_, i) => <li key={i} className={i === walkAt ? 'sel' : i < walkAt ? 'past' : ''} />)}
                    </ol>
                    <h3 className="atlas-walk-tag">{walk[walkAt].tag}</h3>
                    <p className="atlas-walk-say">{walk[walkAt].say}</p>
                    {walk[walkAt].ask && <p className="atlas-walk-ask">{walk[walkAt].ask}</p>}
                    <RefButtons text={[walk[walkAt].tag, walk[walkAt].say, walk[walkAt].ask].join(' ')} refs={refs} idBase="atlas-ref" />
                    <div className="atlas-walk-nav">
                      <button type="button" className="atlas-btn" disabled={walkAt === 0} onClick={() => goStep(walkAt - 1)}>{ATLAS_WORDS.back}</button>
                      {walkAt < walk.length - 1
                        ? <button type="button" className="btn-now" onClick={() => goStep(walkAt + 1)}>{ATLAS_WORDS.next}</button>
                        : <button type="button" className="btn-now" onClick={() => goStep(null)}>{ATLAS_WORDS.done}</button>}
                    </div>
                  </>
                )}
              </section>
            )}
            {steps.length > 1 && (
              <fieldset className="atlas-group">
                <legend>{ATLAS_WORDS.thenNow}</legend>
                <input type="range" min="0" max={steps.length - 1} step="0.01" value={t}
                       aria-valuetext={steps[stepNow]?.label}
                       onChange={e => { cancelAnimationFrame(anim.current); setT(Number(e.target.value)) }}
                       onPointerUp={() => glideTo(Math.round(t))}
                       onKeyDown={e => {
                         const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key]
                         if (d) { e.preventDefault(); glideTo(clamp(stepNow + d, 0, steps.length - 1)) }
                         else if (e.key === 'Home') { e.preventDefault(); glideTo(0) }
                         else if (e.key === 'End') { e.preventDefault(); glideTo(steps.length - 1) }
                       }} />
                <div className="atlas-ticks">
                  {steps.map((s, i) => (
                    <button key={i} type="button" className={`atlas-tick${i === stepNow ? ' sel' : ''}`}
                            aria-pressed={i === stepNow} onClick={() => glideTo(i)}>{s.label}</button>
                  ))}
                </div>
              </fieldset>
            )}
            {layers.length > 0 && (
              <fieldset className="atlas-group">
                <legend>{ATLAS_WORDS.layers}</legend>
                <div className="atlas-chips">
                  {layers.map(l => (
                    <button key={l.id} type="button" className="atlas-chip" aria-pressed={!!on[l.id]}
                            onClick={() => setOn(o => ({ ...o, [l.id]: !o[l.id] }))}>
                      <span className="atlas-check" aria-hidden="true">{on[l.id] ? '✓' : ''}</span>{l.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
            {routes.length > 0 && (
              <fieldset className="atlas-group">
                <legend>{routes.length === 1 ? routes[0].label : ATLAS_WORDS.draw}</legend>
                <div className="atlas-chips">
                  {routes.map(r => (
                    <button key={r.id} type="button" className="atlas-chip atlas-draw"
                            onClick={() => setDrawn(d => ({ ...d, [r.id]: (d[r.id] || 0) + 1 }))}>
                      <span aria-hidden="true">✎</span>{' '}
                      {drawn[r.id] ? ATLAS_WORDS.drawAgain : ATLAS_WORDS.draw}{routes.length > 1 ? `: ${r.label}` : ''}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
          </div>
        ) : null}
      </div>

      <div className="atlas-foot">
        {map.caption && <p className="atlas-caption">{map.caption}</p>}
        <ul className="atlas-sources">
          {sources.map((o, i) => (
            <li key={i}><b>{ATLAS_WORDS.source}</b> {o.what ? `${o.what}: ` : ''}{o.s}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export const ATLAS_STYLES = `
/* ---------- THE ATLAS ---------- */
.stop-map{margin:4px 0 14px}
.atlas-walk{display:flex;flex-direction:column;gap:8px;padding-bottom:12px;border-bottom:1px solid var(--edge)}
.atlas-walk-start{align-self:flex-start;font-size:clamp(16px,1.05vw,23px)}
.atlas-dots{display:flex;gap:7px;list-style:none;margin:0;padding:0}
.atlas-dots li{width:11px;height:11px;border-radius:50%;border:1.5px solid var(--arena-choice-edge)}
.atlas-dots li.past{background:var(--arena-choice-edge)}
.atlas-dots li.sel{background:var(--gold);border-color:var(--gold);transform:scale(1.25)}
.atlas-walk-tag{margin:2px 0 0;font-family:'Barlow Condensed',sans-serif;font-size:clamp(22px,1.6vw,36px);line-height:1.1;color:var(--white)}
.atlas-walk-say{margin:0;font-size:clamp(16px,1.15vw,26px);line-height:1.45;color:var(--white)}
.atlas-walk-ask{margin:0;font-size:clamp(15px,1.05vw,24px);line-height:1.45;color:var(--gold-lit);font-style:italic}
.atlas-walk-nav{display:flex;gap:8px;justify-content:space-between}
.atlas-walk-nav .btn-now,.atlas-walk-start{font-size:clamp(16px,1.05vw,23px);min-height:44px;padding:8px 18px}
.atlas-flag{margin:0 0 12px}
.atlas-unit{margin-bottom:30px}
.atlas-units{margin-top:6px}
.atlas-card{display:flex;flex-direction:column;gap:6px}
.atlas-thumb{display:block;aspect-ratio:16/10;border-radius:8px;overflow:hidden;background:#0E1626;border:1px solid var(--edge);margin-bottom:8px}
.atlas-thumb img{width:100%;height:100%;object-fit:cover;display:block}
.atlas-card .flag{align-self:flex-start}

.atlas-viewer{position:fixed;inset:0;z-index:1000;background:var(--canvas);color:var(--white);
  display:grid;grid-template-rows:auto minmax(0,1fr) auto;grid-template-columns:minmax(0,1fr);font-family:'Outfit',system-ui,sans-serif}
.atlas-bar{display:flex;align-items:center;gap:12px 16px;flex-wrap:wrap;padding:10px 16px;border-bottom:1px solid var(--edge);background:#0E1830}
.atlas-title{font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:.02em;margin:0;flex:1 1 260px;
  font-size:clamp(22px,2.1vw,46px);line-height:1.1;color:var(--white)}
.atlas-tools{display:flex;gap:8px;flex-wrap:wrap}
.atlas-btn{position:relative;min-height:44px;padding:8px 14px;border-radius:9px;background:var(--card);border:1.5px solid var(--arena-choice-edge);
  color:var(--white);font:inherit;font-size:clamp(15px,1vw,22px);cursor:pointer;display:inline-flex;align-items:center;gap:6px}
.atlas-btn:hover:not(:disabled){background:var(--card-lit);border-color:var(--gold)}
.atlas-btn:disabled{opacity:.4;cursor:default}
.atlas-btn[aria-pressed=true]{background:var(--gold);color:var(--canvas);border-color:var(--gold);font-weight:700}
.atlas-close{border-color:var(--gold)}
.atlas-viewer :focus-visible{outline:3px solid var(--gold-lit);outline-offset:2px}

.atlas-body{display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(0,1fr) auto;min-height:0;min-width:0}
.atlas-bar,.atlas-foot,.atlas-controls,.atlas-stage{min-width:0}
@media (min-width:1100px){ .atlas-body.with-controls{grid-template-columns:minmax(0,1fr) minmax(280px,22vw);grid-template-rows:minmax(0,1fr)} }
.atlas-stage{position:relative;overflow:hidden;touch-action:none;cursor:grab;background:#070C16;min-height:0}
.atlas-stage:active{cursor:grabbing}
.atlas-plane{position:absolute;left:50%;top:50%;transform-origin:center center;will-change:transform}
.atlas-img{position:absolute;inset:0;width:100%;height:100%;user-select:none;-webkit-user-drag:none;pointer-events:none}
.atlas-plane > .atlas-img:first-child{position:relative;display:block}
.atlas-layer{transition:opacity .45s ease-in-out}
.atlas-layer.still{transition:none}
.atlas-route path{stroke-dasharray:1;stroke-dashoffset:1;animation:atlas-draw 3s ease-in-out forwards}
.atlas-route.still path{animation:none;stroke-dashoffset:0}
@keyframes atlas-draw{to{stroke-dashoffset:0}}

.atlas-controls{padding:12px 16px;border-top:1px solid var(--edge);background:#0E1830;overflow:auto;max-height:34vh;display:flex;flex-direction:column;gap:12px}
@media (min-width:1100px){ .atlas-controls{border-top:none;border-left:1px solid var(--edge);max-height:none} }
.atlas-group{border:none;margin:0;padding:0;min-width:0}
.atlas-group legend{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.1em;color:var(--gold);
  font-size:clamp(14px,.95vw,22px);margin-bottom:8px;padding:0}
.atlas-group input[type=range]{width:100%;accent-color:var(--gold);min-height:32px}
.atlas-ticks{display:flex;justify-content:space-between;gap:6px;flex-wrap:wrap}
.atlas-tick{background:none;border:1px solid transparent;color:var(--grey);font:inherit;font-size:clamp(14px,.95vw,21px);padding:6px 8px;border-radius:7px;cursor:pointer;min-height:40px}
.atlas-tick.sel{color:var(--white);border-color:var(--gold);font-weight:700}
.atlas-chips{display:flex;flex-wrap:wrap;gap:8px}
.atlas-chip{min-height:44px;padding:8px 14px;border-radius:999px;background:var(--arena-choice);border:1.5px solid var(--arena-choice-edge);
  color:var(--white);font:inherit;font-size:clamp(15px,1vw,22px);cursor:pointer;display:inline-flex;align-items:center;gap:8px;text-align:left}
.atlas-chip:hover{border-color:var(--gold)}
.atlas-chip[aria-pressed=true]{background:#33496F;border-color:var(--gold)}
.atlas-check{display:inline-grid;place-items:center;width:20px;height:20px;border-radius:5px;border:1.5px solid var(--arena-choice-edge);
  font-size:14px;line-height:1;color:var(--canvas);background:transparent}
.atlas-chip[aria-pressed=true] .atlas-check{background:var(--gold);border-color:var(--gold)}

.atlas-foot{padding:10px 16px 12px;border-top:1px solid var(--edge);background:#0E1830}
.atlas-caption{overflow-wrap:anywhere;margin:0 0 4px;font-size:clamp(16px,1.25vw,28px);line-height:1.4;color:var(--white)}
.atlas-sources{overflow-wrap:anywhere;list-style:none;margin:0;padding:0;font-size:clamp(13px,.9vw,19px);line-height:1.45;color:#B7C3D6}
.atlas-sources b{color:var(--gold);font-weight:600}

@media (max-width:600px){
  .atlas-bar{padding:8px 10px;gap:8px}
  .atlas-title{font-size:20px;flex-basis:100%}
  .atlas-tools{width:100%;justify-content:space-between;flex-wrap:nowrap}
  .atlas-btn{padding:6px 10px;font-size:15px;gap:4px;min-width:44px;justify-content:center}
  .atlas-btn .atlas-lbl{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
  .atlas-btn span[aria-hidden]{font-size:20px}
  .atlas-controls{max-height:30vh;padding:10px}
  .atlas-foot{padding:8px 10px 10px;max-height:24vh;overflow:auto}
}
@media (max-height:500px) and (orientation:landscape){
  .atlas-bar{padding:6px 10px}
  .atlas-title{font-size:18px}
  .atlas-btn{min-height:40px;padding:5px 10px;font-size:14px}
  .atlas-body.with-controls{grid-template-columns:minmax(0,1fr) minmax(220px,34vw);grid-template-rows:minmax(0,1fr)}
  .atlas-controls{border-top:none;border-left:1px solid var(--edge);max-height:none}
  .atlas-foot{padding:6px 10px}
  .atlas-caption{font-size:14px}
}
@media (prefers-reduced-motion: reduce){
  .atlas-layer{transition:none}
  .atlas-route path{animation:none;stroke-dashoffset:0}
}
`
