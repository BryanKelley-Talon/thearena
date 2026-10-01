// ============================================================
// DOC ASSIST — every casefile document, with a walk-through beside it.
// Built by Josh 2026-10-01 on BK's rulings of 08:16 (at Sam's desk) and the
// content Sam sent at 08:40 (BK signed 08:38: "yes to this. well done. signed.").
//
// BK's design test (2026-09-30 23:03): "its not going to answer for them, its
// going to train them to do it." So:
//   • The document opens exactly as printed. The walk sits behind a button and
//     runs in order, one step at a time, and closes whenever the kid wants.
//   • The walk carries the casefile's own questions, read-only, plus one BK line.
//     No answers, no models, no typing box, nothing scored, nothing stored.
//   • Easier to read swaps the document body only; the source line stays.
//   • Read it to me uses ON-DEVICE voices only (localService === true). Nothing is
//     recorded, nothing is sent. No local voice → no button. Never a network voice.
//
// Every word a student reads comes from the authoring desk's pack, except the
// chrome lines in CHROME below (proposed to BK in chat 2026-10-01 08:5x).
// The pack is one file per unit room; casefiles A · B · C sit inside it.
// ============================================================
import { useEffect, useMemo, useRef, useState } from 'react'

export const CHROME = {
  section: 'Doc Assist',
  cardType: 'Doc Assist',
  cardName: 'Your casefile documents',
  building: 'Under construction',
  docLabel: n => `Document ${n}`,
  page: p => `Casefile page ${p}`,
  backTo: id => `Casefile ${id}`,
  picture: "What's in the picture",
  prevDoc: 'Previous document',
  nextDoc: 'Next document',
  asks: 'Casefile asks:',
  outLoud: 'OUT LOUD',
}

const imgName = f => String(f || '').split('/').pop()
const imgSrc = f => `/content/${imgName(f)}`
export const openCasefiles = pack => (pack?.casefiles || []).filter(c => c.status === 'open' && (c.docs || []).length)

// ── READ IT TO ME ───────────────────────────────────────────
// On-device voices only. Chrome lists Google's network voices beside the
// Chromebook's own; those send the text to a server, so they are never used.
function pickLocalVoice() {
  const ss = typeof window !== 'undefined' ? window.speechSynthesis : null
  if (!ss || typeof window.SpeechSynthesisUtterance === 'undefined') return null
  const local = ss.getVoices().filter(v => v.localService === true && /^en\b|^en[-_]/i.test(v.lang || ''))
  if (!local.length) return null
  return local.find(v => /^en[-_]US$/i.test(v.lang) && v.default)
      || local.find(v => /^en[-_]US$/i.test(v.lang))
      || local.find(v => v.default) || local[0]
}

export function useLocalVoice() {
  const [voice, setVoice] = useState(() => pickLocalVoice())
  useEffect(() => {
    const ss = typeof window !== 'undefined' ? window.speechSynthesis : null
    if (!ss) return
    const update = () => setVoice(pickLocalVoice())
    update()
    ss.addEventListener?.('voiceschanged', update)
    return () => ss.removeEventListener?.('voiceschanged', update)
  }, [])
  return voice
}

// Short chunks: some engines stop a long utterance part-way. Sentences, grouped.
function chunks(parts) {
  const out = []
  for (const p of parts.filter(Boolean)) {
    // A fill-in line ("because ___") is read as "blank", never as underscores.
    const sentences = String(p).replace(/_{2,}/g, 'blank').match(/[^.!?]+[.!?]+["”’)]*\s*|[^.!?]+$/g) || [String(p)]
    let buf = ''
    for (const s of sentences) {
      if ((buf + s).length > 220 && buf) { out.push(buf.trim()); buf = '' }
      buf += s
    }
    if (buf.trim()) out.push(buf.trim())
  }
  return out
}

// One speaker per page. `key` names what is being read, so the right button
// shows "Stop reading" and starting one reader stops the other.
function useSpeaker(voice) {
  const [speaking, setSpeaking] = useState(null)
  const run = useRef(0)
  const stop = () => {
    run.current++
    try { window.speechSynthesis?.cancel() } catch {}
    setSpeaking(null)
  }
  const speak = (key, parts) => {
    if (!voice) return
    stop()
    const id = ++run.current
    const list = chunks(parts)
    if (!list.length) return
    setSpeaking(key)
    list.forEach((text, i) => {
      const u = new window.SpeechSynthesisUtterance(text)
      u.voice = voice
      u.lang = voice.lang
      u.rate = 0.95
      if (i === list.length - 1) u.onend = () => { if (run.current === id) setSpeaking(null) }
      u.onerror = () => { if (run.current === id) setSpeaking(null) }
      window.speechSynthesis.speak(u)
    })
  }
  useEffect(() => () => { try { window.speechSynthesis?.cancel() } catch {} }, [])
  return { speaking, speak, stop }
}

function ReadButton({ voice, speaker, k, parts, labels }) {
  if (!voice) return null
  const on = speaker.speaking === k
  return (
    <button type="button" className="da-btn" aria-pressed={on}
            onClick={() => (on ? speaker.stop() : speaker.speak(k, parts))}>
      <span aria-hidden="true" className="da-ico">{on ? '■' : '▶'}</span>{on ? labels.stop : labels.read}
    </button>
  )
}

// ── THE ROOM CARD ───────────────────────────────────────────
export function DocAssistCard({ pack, onOpen }) {
  return (
    <button type="button" className="card" onClick={onOpen}>
      <div className="card-type">{CHROME.cardType}</div>
      <div className="card-name">{CHROME.cardName}</div>
      {pack?.tile && <div className="card-blurb">{pack.tile}</div>}
      <span className="flag live">Open</span>
    </button>
  )
}

// ── THE CASEFILE LIST ───────────────────────────────────────
export function DocAssistHome({ pack, onOpenDoc }) {
  return (
    <div className="da-home">
      {pack.tile && <p className="lane-intro">{pack.tile}</p>}
      {(pack.casefiles || []).map(cf => {
        const open = cf.status === 'open' && (cf.docs || []).length > 0
        return (
          <section key={cf.id} className="da-cf">
            <h3 className="room-section da-cf-head">
              <span>{cf.title || CHROME.backTo(cf.id)}</span>
              {!open && <span className="flag building">{CHROME.building}</span>}
            </h3>
            {open && (
              <div className="practice-rows">
                {cf.docs.map((d, i) => (
                  <button key={d.n} type="button" className="practice-row da-row" onClick={() => onOpenDoc(cf.id, i)}>
                    <span>
                      <span className="da-row-n">{CHROME.docLabel(d.n)}</span>
                      <span className="da-row-title">{d.title}</span>
                      <span className="row-blurb">{CHROME.page(d.page)}</span>
                    </span>
                    <span className="flag live">Open</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

// ── ONE DOCUMENT ────────────────────────────────────────────
export function DocAssistDoc({ pack, doc, portrait, onPrev, onNext }) {
  const voice = useLocalVoice()
  const speaker = useSpeaker(voice)
  const L = pack.labels || {}
  const walkSteps = pack.walk || []
  const [easier, setEasier] = useState(false)
  const [walkOpen, setWalkOpen] = useState(false)
  const [at, setAt] = useState(0)               // 0..4 the steps, 5 the close
  const walkRef = useRef(null)
  const isImage = doc.kind === 'image'
  const canEasier = isImage ? !!doc.describe : !!(doc.easier?.text || []).length
  const body = isImage ? [] : (easier ? doc.easier.text : doc.text) || []

  // A new document starts as printed, walk closed, nothing reading.
  useEffect(() => { setEasier(false); setWalkOpen(false); setAt(0); speaker.stop() }, [doc.n])
  useEffect(() => { speaker.stop() }, [at, easier, walkOpen])

  const openWalk = () => {
    setWalkOpen(true); setAt(0)
    requestAnimationFrame(() => walkRef.current?.focus())
  }
  const closeWalk = () => { setWalkOpen(false); setAt(0) }

  // What "Read it to me" says for the document: what is on the screen, in order.
  const docParts = [
    doc.before && doc.before.title, doc.before && doc.before.text,
    doc.title,
    doc.src,
    ...(isImage ? [easier ? doc.describe : doc.image_alt] : body),
  ]

  const step = walkSteps[at]
  const ds = (doc.steps || [])[at]
  const say = step && (isImage && step.say_image ? step.say_image : step.say)
  const stepParts = at >= walkSteps.length
    ? [doc.close]
    : [step?.step, say, ds?.question && `${CHROME.asks} ${ds.question}`, ds?.mode === 'out loud' ? CHROME.outLoud : null, ds?.line]

  return (
    <div className="da-doc">
      <h2 className="da-title">{doc.title}</h2>
      <div className="da-tools" role="toolbar" aria-label={CHROME.docLabel(doc.n)}>
        {!walkOpen && <button type="button" className="da-btn da-btn-main" onClick={openWalk}>{L.walk}</button>}
        {canEasier && (
          <button type="button" className="da-btn" aria-pressed={easier} onClick={() => setEasier(e => !e)}>
            {easier ? L.original : L.easier}
          </button>
        )}
        <ReadButton voice={voice} speaker={speaker} k="doc" parts={docParts} labels={L} />
      </div>

      <div className={walkOpen ? 'da-grid' : 'da-grid da-solo'}>
        <div className="da-left">
          {doc.before && (
            <aside className="da-before" aria-label={doc.before.title}>
              <div className="da-before-title">{doc.before.title}</div>
              <p>{doc.before.text}</p>
            </aside>
          )}
          <figure className="stimulus da-paper">
            <div className="doc-tag">{CHROME.docLabel(doc.n)}</div>
            {/* As printed in the casefile: the source line sits above the document. */}
            <div className="da-src">
              {doc.src}
              {!isImage && easier && doc.easier?.label && <span className="da-easier-label">{doc.easier.label}</span>}
            </div>
            {isImage && (
              <a className="da-imglink" href={imgSrc(doc.image_file)} target="_blank" rel="noopener noreferrer">
                <img src={imgSrc(doc.image_file)} alt={doc.image_alt || ''} />
              </a>
            )}
            {isImage && easier && doc.describe && (
              <div className="da-describe">
                <div className="da-describe-head">{CHROME.picture}</div>
                <p>{doc.describe}</p>
              </div>
            )}
            {!isImage && (
              <div className="da-text" lang="en">
                {body.map((p, i) => <p key={`${easier ? 'e' : 'o'}${i}`}>{p}</p>)}
              </div>
            )}
            {doc.licence?.text && <p className="da-licence">{doc.licence.text}</p>}
          </figure>
        </div>

        {walkOpen && (
          <section className="da-walk" ref={walkRef} tabIndex={-1} aria-label={pack.walk_name}>
            <div className="da-walk-top">
              <div className="da-walk-name">{pack.walk_name}</div>
              <div className="da-dots" aria-hidden="true">
                {walkSteps.map((_, i) => <span key={i} className={i < at ? 'da-dot done' : i === at ? 'da-dot now' : 'da-dot'} />)}
              </div>
            </div>
            {at < walkSteps.length ? (
              <div className="da-step" key={at} aria-live="polite">
                <div className="da-tag">{step.tag}</div>
                <div className="da-stepline">{step.step}</div>
                {say && <p className="da-say">{say}</p>}
                {ds?.question && (
                  <div className="da-ask">
                    <div className="da-ask-head">{CHROME.asks}</div>
                    <p>{ds.question}{ds.mode === 'out loud' && <span className="da-loud"> · {CHROME.outLoud}</span>}</p>
                  </div>
                )}
                {ds?.line && (
                  <div className="guide-says da-bk" role="note">
                    {portrait && <img className="guide-face" src={`/${portrait}`} alt="" />}
                    <p>{ds.line}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="da-step" key="close" aria-live="polite">
                <div className="guide-says da-bk" role="note">
                  {portrait && <img className="guide-face" src={`/${portrait}`} alt="" />}
                  <p>{doc.close}</p>
                </div>
              </div>
            )}
            <div className="da-walk-nav">
              <button type="button" className="btn-ghost" onClick={() => setAt(a => Math.max(0, a - 1))} disabled={at === 0}>{L.back}</button>
              {at < walkSteps.length && <button type="button" className="da-btn da-btn-main" onClick={() => setAt(a => a + 1)}>{L.next}</button>}
              <ReadButton voice={voice} speaker={speaker} k={`walk-${at}`} parts={stepParts} labels={L} />
              <button type="button" className="btn-ghost" onClick={closeWalk}>{L.close}</button>
            </div>
          </section>
        )}
      </div>

      <div className="da-docnav">
        <button type="button" className="btn-ghost" onClick={onPrev} disabled={!onPrev}>&larr; {CHROME.prevDoc}</button>
        <button type="button" className="btn-ghost" onClick={onNext} disabled={!onNext}>{CHROME.nextDoc} &rarr;</button>
      </div>
    </div>
  )
}

export const DOCASSIST_STYLES = `
/* ---------- DOC ASSIST ---------- */
.practice-row .row-blurb{display:block;color:var(--grey);font-size:15px;line-height:1.4;margin-top:3px;font-weight:400}
.da-cf{margin-bottom:28px;max-width:860px}
.da-cf-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.da-cf-head .flag{margin-top:0}
.da-row-n{display:block;font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.12em;
  font-size:12.5px;color:var(--gold);margin-bottom:2px}
.da-row-title{display:block}
.da-title{font-family:'Barlow Condensed',sans-serif;font-size:clamp(28px,4.4vw,38px);text-transform:uppercase;
  line-height:1.08;color:var(--white);margin:0 0 14px;max-width:900px}
.da-tools{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 18px}
.da-btn{display:inline-flex;align-items:center;gap:8px;background:var(--arena-choice);border:1.5px solid var(--arena-choice-edge);
  color:var(--white);padding:11px 16px;border-radius:9px;font-family:'Outfit',sans-serif;font-size:16px;cursor:pointer;min-height:44px}
.da-btn:hover{border-color:var(--gold)}
.da-btn[aria-pressed=true]{border-color:var(--gold);box-shadow:inset 0 0 0 1px var(--gold)}
.da-btn-main{background:var(--gold);border-color:var(--gold);color:var(--canvas);font-weight:700}
.da-btn-main:hover{background:var(--gold-lit);border-color:var(--gold-lit)}
.da-ico{font-size:12px;line-height:1}
.da-grid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:22px;align-items:start}
.da-grid.da-solo{grid-template-columns:minmax(0,1fr);max-width:860px}
.da-walk{position:sticky;top:12px;background:var(--card);border:1px solid var(--arena-choice-edge);border-radius:12px;
  padding:16px 18px 16px;box-shadow:0 6px 18px rgba(0,0,0,.28);outline:none}
.da-walk:focus-visible{outline:3px solid var(--gold-lit)}
@media (max-width:900px){
  .da-grid{grid-template-columns:minmax(0,1fr)}
  .da-walk{position:static;order:-1}
}
.da-walk-top{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px}
.da-walk-name{font-family:'Barlow Condensed',sans-serif;font-size:21px;letter-spacing:.1em;color:var(--gold)}
.da-dots{display:flex;gap:6px}
.da-dot{width:11px;height:11px;border-radius:50%;border:2px solid var(--arena-choice-edge);background:transparent}
.da-dot.done{background:var(--arena-choice-edge)}
.da-dot.now{border-color:var(--gold);background:var(--gold);transform:scale(1.15)}
.da-tag{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.13em;font-size:13px;color:var(--gold-lit);margin-bottom:4px}
.da-stepline{font-family:'Barlow Condensed',sans-serif;font-size:27px;line-height:1.1;text-transform:uppercase;color:var(--white);margin-bottom:8px}
.da-say{color:var(--white);font-size:17px;line-height:1.55;margin:0 0 14px}
.da-ask{background:var(--card-lit);border:1px solid var(--edge);border-left:4px solid var(--gold);border-radius:8px;padding:10px 13px;margin:0 0 6px}
.da-ask-head{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.1em;font-size:13.5px;color:var(--gold);margin-bottom:4px;font-weight:600}
.da-loud{color:var(--gold-lit);font-weight:700;font-family:'Barlow Condensed',sans-serif;letter-spacing:.08em;white-space:nowrap}
.da-ask p{color:var(--white);font-size:17px;line-height:1.5;margin:0}
.da-bk{margin:22px 4px 22px;max-width:none}
.da-bk .guide-face{width:52px;height:52px}
.da-bk p{font-size:17px}
.da-walk-nav{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:8px}
.da-walk-nav .btn-ghost{min-height:44px;font-size:16px}
.da-walk-nav .btn-ghost:disabled{opacity:.4;cursor:default}
.da-paper .doc-tag{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.12em;font-size:12.5px;margin-bottom:10px}
.da-text p{color:#2c2110;font-size:18px;line-height:1.75;font-family:Georgia,'Times New Roman',serif;margin:0 0 14px}
.da-text p:last-child{margin-bottom:0}
.da-src{color:#4a3a1c;font-size:15px;line-height:1.5;font-style:italic;margin:0 0 14px;padding-bottom:10px;
  border-bottom:1px solid rgba(60,44,18,.22)}
.da-imglink{display:block;cursor:zoom-in}
.da-imglink img{margin-bottom:10px}
.da-easier-label{display:block;font-style:normal;font-weight:700;color:#5a4210;margin-top:4px}
.da-licence{color:#4a3a1c;font-size:13.5px;line-height:1.5;margin:12px 0 0;padding-top:8px;border-top:1px solid rgba(60,44,18,.22)}
.da-describe{background:rgba(255,255,255,.55);border:1px solid rgba(60,44,18,.3);border-left:4px solid #8a6a1f;border-radius:6px;padding:10px 13px;margin:4px 0 4px}
.da-describe-head{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.1em;font-size:13px;color:#5a4210;font-weight:700;margin-bottom:4px}
.da-describe p{color:#2c2110;font-size:17px;line-height:1.65;margin:0}
.da-before{background:var(--card);border:1px solid var(--edge);border-left:4px solid var(--gold);border-radius:8px;padding:12px 15px;margin:0 0 16px}
.da-before-title{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.12em;font-size:15px;color:var(--gold);font-weight:700;margin-bottom:4px}
.da-before p{color:var(--white);font-size:17px;line-height:1.55;margin:0}
.da-docnav{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:22px 0 0;max-width:860px}
.da-docnav .btn-ghost{min-height:44px;font-size:16px;background:var(--card);border-style:solid;border-color:var(--arena-choice-edge)}
.da-docnav .btn-ghost:disabled{visibility:hidden}
@media (prefers-reduced-motion:no-preference){
  .da-step{animation:da-in .22s var(--ease-calm,ease-out) both}
  @keyframes da-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
  .da-dot{transition:transform .14s var(--ease-settle),background-color .12s}
}
`
