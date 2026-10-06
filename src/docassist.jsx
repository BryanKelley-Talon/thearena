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
import { RefButtons, mentions } from './refcards.jsx'
import { useEffect, useMemo, useRef, useState } from 'react'

export const CHROME = {
  section: 'Doc Assist',
  cardType: 'Doc Assist',
  cardName: 'Your casefile documents',
  building: 'Under construction',
  docLabel: n => `Document ${n}`,
  // One word, every room (BK 2026-10-01 09:25: "Casefile has to replace packet. consistency.").
  page: p => `Casefile page ${p}`,
  backTo: id => `Casefile ${id}`,
  picture: "What's in the picture",
  prevDoc: 'Previous document',
  nextDoc: 'Next document',
  asks: 'Ask yourself:',          // BK 2026-10-01 09:27 ("2. agreed"), at Sam's desk
  outLoud: 'OUT LOUD',
  // Doc Assist v4 (Will's 10.2 B and C, BK signed 2026-10-02 11:32 / 13:22). The pack carries
  // its own button words (labels.annotate, labels.fr); these are the few it doesn't.
  frAsks: 'Demande-toi :',        // as printed in Will's signed B wording PDF (BK 11:32)
  frOff: 'In English',            // (a) BK 2026-10-02 13:30: "That s fine."
  annotateHide: 'Hide how to annotate',   // (b) BK 13:30: "okay. make it visually make sense to kids"
  mark: m => String(m || '').toUpperCase(),   // BOX · CIRCLE · MARGIN · UNDERLINE, as the signed PDFs print them
}

const imgName = f => String(f || '').split('/').pop()
const imgSrc = f => `/content/${imgName(f)}`
export const openCasefiles = pack => (pack?.casefiles || []).filter(c => c.status === 'open' && (c.docs || []).length)

// ── READ IT TO ME ───────────────────────────────────────────
// On-device voices only. Chrome lists Google's network voices beside the
// Chromebook's own; those send the text to a server, so they are never used.
// The French view (2026-10-02) reads with a French on-device voice, under the same rule:
// no local French voice on the device → no Read button in French.
const HOME_LANG = { en: 'US', fr: 'FR' }
function pickLocalVoice(lang = 'en') {
  const ss = typeof window !== 'undefined' ? window.speechSynthesis : null
  if (!ss || typeof window.SpeechSynthesisUtterance === 'undefined') return null
  const re = new RegExp(`^${lang}\\b|^${lang}[-_]`, 'i')
  const home = new RegExp(`^${lang}[-_]${HOME_LANG[lang] || ''}$`, 'i')
  const local = ss.getVoices().filter(v => v.localService === true && re.test(v.lang || ''))
  if (!local.length) return null
  return local.find(v => home.test(v.lang) && v.default)
      || local.find(v => home.test(v.lang))
      || local.find(v => v.default) || local[0]
}

export function useLocalVoice(lang = 'en') {
  const [voice, setVoice] = useState(() => pickLocalVoice(lang))
  useEffect(() => {
    const ss = typeof window !== 'undefined' ? window.speechSynthesis : null
    if (!ss) return
    const update = () => setVoice(pickLocalVoice(lang))
    update()
    ss.addEventListener?.('voiceschanged', update)
    return () => ss.removeEventListener?.('voiceschanged', update)
  }, [lang])
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
          <section key={cf.id} id={`da-cf-${cf.id}`} className="da-cf">
            <h3 className="room-section da-cf-head">
              <span>{cf.title || CHROME.backTo(cf.id, cf)}</span>
              {!open && <span className="flag building">{CHROME.building}</span>}
            </h3>
            {open && (
              <div className="practice-rows">
                {cf.docs.map((d, i) => (
                  <button key={d.n} type="button" className="practice-row da-row" onClick={() => onOpenDoc(cf.id, i)}>
                    <span>
                      <span className="da-row-n">{CHROME.docLabel(d.n)}</span>
                      <span className="da-row-title">{d.title}</span>
                      <span className="row-blurb">{CHROME.page(d.page, cf)}</span>
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
// Two pack dialects, one page. US 11.2 A: a step carries `question` + `mode`.
// Global (Will, 09:09): a step carries `questions` [{ n, text, mode }], 0–2 of them,
// with the number the page prints (or null). Pictures: `image_file` or an `images`
// list (10.1 Document 1, two maps). Boxes above the document: `before_we_talk`
// {title, text}; `before` is either that shape (US) or a line the page prints (Global).
const stepQuestions = s => Array.isArray(s?.questions) ? s.questions
  : (s?.question ? [{ n: null, text: s.question, mode: s.mode }] : [])
const docImages = d => Array.isArray(d.images) && d.images.length
  ? d.images.map(i => ({ file: i.file, alt: i.alt || i.describe, describe: i.describe, label: i.label }))
  : (d.image_file ? [{ file: d.image_file, alt: d.image_alt, describe: d.describe }] : [])
const boxOf = b => (b && typeof b === 'object' && b.text ? b : null)

// THE STEP-5 CARD (BK 10:26: "a button ... that kids can pop up their enduring issues
// list/definitions or Civic Principles in US"). One component, each course's own block:
// Global sends `umbrellas`; US may send `q4_card` in the same shape.
const q4Card = pack => pack.q4_card || pack.umbrellas || null
const q4Label = pack => pack.labels?.q4_card || pack.labels?.umbrellas || q4Card(pack)?.button

function Umbrellas({ u }) {
  return (
    <div className="da-umb" id="da-umbrellas">
      <div className="da-umb-title">{u.title}</div>
      {u.intro && <p className="da-umb-intro">{u.intro}</p>}
      <ol className="da-umb-list">
        {(u.items || []).map((it, i, all) => (
          <li key={it.n}>
            {/* US card (Sam 10:52): a subheading each time the card's group changes. */}
            {it.group && it.group !== all[i - 1]?.group && <div className="da-umb-group">{it.group}</div>}
            <div className="da-umb-body">
              <div className="da-umb-name"><span className="da-umb-n">{it.n}</span>{it.name}</div>
              <div className="da-umb-q">{it.question}</div>
              {Array.isArray(it.issue_defs) && it.issue_defs.length
                ? <dl className="da-umb-defs">
                    {it.issue_defs.map(d => (
                      <div key={d.name}><dt>{d.name}</dt><dd>{d.definition}</dd></div>
                    ))}
                  </dl>
                : it.issues && <div className="da-umb-issues">{it.issues}</div>}
            </div>
          </li>
        ))}
      </ol>
      {(u.close || []).map((c, i) => <p key={i} className="da-umb-close">{c}</p>)}
    </div>
  )
}

// ── DOC ASSIST v4 (Will, 10.2 B and C; BK signed 2026-10-02 11:32 and 13:22) ──
// Two buttons on a document that carries them:
//   • How to annotate: the method for the document's kind (text · picture · map), the model
//     notes on parts no question asks about, and one outside-evidence line (an example where
//     outside evidence isn't scored, where to look where it is). On an English text document the
//     notes are also drawn on the document itself, numbered, so the kid watches it done.
//   • En français: the document and the walk swap to French; the source line stays as printed.
//     BK 11:32: the notes stay English ("just the documents"). BK 12:06: the work is written in
//     English; pack.fr.note says so under the label on every document.
// Nothing typed, nothing stored. French stays on from one document to the next for this visit
// only (a variable, never storage).
let frThisVisit = false

// The French step-5 card: Will's French names, questions and issues; the issue names stay
// English (as on the paper) with French definitions (pack.fr.umbrellas.issue_defs).
function frCard(pack) {
  const en = q4Card(pack), f = pack.fr?.umbrellas
  if (!en || !f) return en
  return {
    ...en, title: f.title || en.title, intro: f.intro ?? en.intro, close: f.close || en.close,
    items: (en.items || []).map((it, i) => {
      const fi = (f.items || [])[i] || {}
      return {
        ...it, name: fi.name || it.name, question: fi.question || it.question, issues: fi.issues || it.issues,
        issue_defs: (it.issue_defs || []).map(x => ({ name: x.name, definition: f.issue_defs?.[x.name] || x.definition })),
      }
    }),
  }
}

// Draw the model notes on the printed words: each `where` that appears in a string is wrapped
// in its mark (box · circle · margin) with the note's number. First match only.
// Sam's US packs (2026-10-02) may point into the source line as "Lately, in the source line":
// those words are looked for in the source line only.
const SRC_PTR = /^(.*), in the source line$/
export const noteTarget = (where, isSrc) => {
  const m = String(where || '').match(SRC_PTR)
  if (m) return isSrc ? m[1] : null
  return where || null
}
function marked(str, notes, isSrc = false) {
  if (!notes?.length) return str
  const hits = []
  notes.forEach((nt, k) => {
    const needle = noteTarget(nt.where, isSrc)
    const at = needle ? String(str).indexOf(needle) : -1
    if (at >= 0 && !hits.some(h => at < h.at + h.len && h.at < at + needle.length)) hits.push({ at, len: needle.length, k, mark: nt.mark })
  })
  if (!hits.length) return str
  hits.sort((a, b) => a.at - b.at)
  const out = []
  let i = 0
  for (const h of hits) {
    if (h.at > i) out.push(str.slice(i, h.at))
    out.push(
      <span key={h.k} className={`da-mk da-mk-${h.mark}`}>
        {str.slice(h.at, h.at + h.len)}<sup className="da-mk-n" aria-label={`, note ${h.k + 1}`}>{h.k + 1}</sup>
      </span>)
    i = h.at + h.len
  }
  if (i < str.length) out.push(str.slice(i))
  return out
}

function AnnotatePanel({ pack, doc, fr }) {
  const A = pack.annotate || {}
  const a = doc.annotate
  const method = A.methods?.[a.kind] || []
  const oeLabel = a.oe?.kind === 'where' ? A.oe_where_label : A.oe_example_label
  return (
    <section className="da-ann" id="da-annotate" aria-label={A.button}>
      <div className="da-ann-title">{A.button}</div>
      <ol className="da-ann-method">
        {method.map(([tag, step], i) => (
          <li key={i}><span className="da-ann-n">{i + 1}</span><span><b className="da-ann-tag">{tag}</b> {step}</span></li>
        ))}
      </ol>
      <div className="da-ann-head">{A.model_label}</div>
      {/* (d) In the French view, Will's French line replaces the English one; the notes stay English. */}
      <p className="da-ann-intro" lang={fr && pack.fr?.annotate_note ? 'fr' : 'en'}>
        {fr && pack.fr?.annotate_note ? pack.fr.annotate_note : A.model_note}
      </p>
      <ol className="da-ann-notes" lang="en">
        {(a.notes || []).map((n, i) => (
          <li key={i}>
            <span className={`da-ann-key da-mk-${n.mark}`} aria-hidden="true">{i + 1}</span>
            <div>
              <div><b className="da-ann-mark">{CHROME.mark(n.mark)}</b> <span className="da-ann-where">{n.where}</span></div>
              <p>{n.note}</p>
            </div>
          </li>
        ))}
      </ol>
      {a.oe?.text && (
        <div className="da-ann-oe">
          <div className="da-ann-head">{oeLabel}</div>
          <p lang="en">{a.oe.text}</p>
        </div>
      )}
    </section>
  )
}

export function DocAssistDoc({ pack, doc, refs, portrait, onPrev, onNext }) {
  const voiceEn = useLocalVoice('en')
  const voiceFr = useLocalVoice('fr')
  const walkSteps = pack.walk || []
  const [easier, setEasier] = useState(false)
  const [walkOpen, setWalkOpen] = useState(false)
  const [at, setAt] = useState(0)               // 0..4 the steps, 5 the close
  const [umbOpen, setUmbOpen] = useState(false)
  const [annOpen, setAnnOpen] = useState(false)
  const [frOn, setFrOn] = useState(frThisVisit)
  const walkRef = useRef(null)
  const F = doc.fr && pack.fr ? doc.fr : null      // this document has a French version
  const fr = frOn && !!F
  const canAnnotate = !!(doc.annotate && pack.annotate)
  const voice = fr ? voiceFr : voiceEn
  const speaker = useSpeaker(voice)
  const L = fr ? { ...(pack.labels || {}), ...(pack.fr.labels || {}) } : (pack.labels || {})
  const isImage = doc.kind === 'image'
  const images = isImage ? docImages(doc) : []
  // (c) No French easy version in the pack, so Easier to read is off in the French view.
  const canEasier = !fr && (isImage ? images.some(i => i.describe) : !!(doc.easier?.text || []).length)
  const showEasier = easier && canEasier
  const body = isImage ? [] : (fr ? F.text : showEasier ? doc.easier.text : doc.text) || []
  const bwtEn = boxOf(doc.before_we_talk) || boxOf(doc.before)
  const bwt = bwtEn && fr && (typeof F.before_we_talk === 'string' || typeof F.before === 'object')
    ? { title: bwtEn.title, text: (typeof F.before_we_talk === 'string' ? F.before_we_talk : F.before?.text) || bwtEn.text, fr: true }
    : bwtEn
  const printedEn = typeof doc.before === 'string' ? doc.before : null
  const printed = printedEn && fr && typeof F.before === 'string' ? F.before : printedEn
  const note = doc.note && doc.note.text ? doc.note : null   // printed on the page above the quote (11.1 B Doc 18)
  const ww = fr && F.word_watch ? F.word_watch : doc.word_watch
  // Marks go on the printed English words only (the notes are English, BK 11:32).
  const marks = annOpen && canAnnotate && !fr && !showEasier && !isImage ? doc.annotate.notes : null

  // A new document starts as printed, walk closed, nothing reading. French stays as the kid left it.
  useEffect(() => { setEasier(false); setWalkOpen(false); setAt(0); setUmbOpen(false); setAnnOpen(false); speaker.stop() }, [doc.n, doc.title])
  useEffect(() => { speaker.stop(); setUmbOpen(false) }, [at, easier, walkOpen, frOn])

  const openWalk = () => {
    setWalkOpen(true); setAt(0)
    requestAnimationFrame(() => walkRef.current?.focus())
  }
  const closeWalk = () => { setWalkOpen(false); setAt(0) }
  const toggleFr = () => { const v = !frOn; frThisVisit = v; setFrOn(v) }

  const title = fr ? F.title : doc.title
  // What "Read it to me" says for the document: what is on the screen, in order. In French the
  // printed English source line is left to the eye (a French voice would mangle it).
  const docParts = fr
    ? [bwt?.text, printed, title, ...(isImage ? [F.describe] : body), ww?.title, ww?.text]
    : [bwt?.title, bwt?.text, printed, note?.title, note?.text, title, doc.src,
       ...(isImage ? images.flatMap(i => [i.label, showEasier && i.describe ? i.describe : i.alt]) : body),
       ww?.title, ww?.text]

  const step = fr ? (pack.fr.walk || [])[at] || walkSteps[at] : walkSteps[at]
  const dsEn = (doc.steps || [])[at]
  const dsFr = fr ? (F.steps || [])[at] : null
  const qs = fr
    ? (dsFr?.question ? [{ n: null, text: dsFr.question, mode: dsEn?.mode }] : [])
    : stepQuestions(dsEn)
  const line = fr ? dsFr?.line : dsEn?.line
  const asks = fr ? CHROME.frAsks : CHROME.asks
  const say = step && (isImage && step.say_image ? step.say_image : step.say)
  const qLine = q => `${q.n != null ? `${q.n}. ` : ''}${q.text}`
  const tipEn = dsEn?.tip && (dsEn.tip.text || []).length ? dsEn.tip : null
  const tip = tipEn && fr ? (F.tip && (F.tip.text || []).length ? F.tip : null) : tipEn
  const close = fr ? F.close : doc.close
  const stepParts = at >= walkSteps.length
    ? [close]
    : [step?.step, say, ...qs.flatMap(q => [`${asks} ${qLine(q)}`, q.mode === 'out loud' ? CHROME.outLoud : null]), line, tip?.title, ...(tip?.text || [])]
  const card = fr ? frCard(pack) : q4Card(pack)
  // The list's button sits on step 5, and on any step whose words point at the list (BK 22:59).
  const stepText = at < walkSteps.length ? [step?.tag, step?.step, say, ...qs.map(q => q.text), line, tip?.title, ...(tip?.text || [])].join(' ') : ''
  const cardKind = pack.umbrellas ? 'umbrellas' : 'civic'
  const showUmb = card && q4Label(pack) && (at === walkSteps.length - 1 || mentions(stepText, cardKind))

  return (
    <div className="da-doc">
      <h2 className="da-title" lang={fr ? 'fr' : 'en'}>{title}</h2>
      <div className="da-tools" role="toolbar" aria-label={CHROME.docLabel(doc.n)}>
        {!walkOpen && <button type="button" className="da-btn da-btn-main" onClick={openWalk}>{L.walk}</button>}
        {canEasier && (
          <button type="button" className="da-btn" aria-pressed={easier} onClick={() => setEasier(e => !e)}>
            {easier ? L.original : L.easier}
          </button>
        )}
        <ReadButton voice={voice} speaker={speaker} k="doc" parts={docParts} labels={L} />
        {canAnnotate && (
          <button type="button" className="da-btn" aria-expanded={annOpen} aria-controls="da-annotate"
                  onClick={() => setAnnOpen(o => !o)}>
            <span aria-hidden="true" className="da-ico">{annOpen ? '−' : '+'}</span>{annOpen ? CHROME.annotateHide : (pack.labels?.annotate || pack.annotate.button)}
          </button>
        )}
        {F && (
          <button type="button" className="da-btn" aria-pressed={fr} onClick={toggleFr} lang={fr ? 'en' : 'fr'}>
            {fr ? CHROME.frOff : (pack.labels?.fr || pack.fr.button)}
          </button>
        )}
      </div>

      <div className={walkOpen ? 'da-grid' : 'da-grid da-solo'}>
        <div className="da-left">
          {bwt && (
            <aside className="da-before" aria-label={bwt.title}>
              {bwt.title && <div className="da-before-title">{bwt.title}</div>}
              <p lang={bwt.fr ? 'fr' : 'en'}>{bwt.text}</p>
            </aside>
          )}
          {printed && <p className="da-printed" lang={fr ? 'fr' : 'en'}>{printed}</p>}
          {note && (
            <div className="da-printed da-note">
              {note.title && <div className="da-note-title">{note.title}</div>}
              <p>{note.text}</p>
            </div>
          )}
          <figure className="stimulus da-paper">
            <div className="doc-tag">{CHROME.docLabel(doc.n)}</div>
            {/* As printed in the casefile: the source line sits above the document. It stays as printed in French. */}
            <div className="da-src" lang="en">
              {marks ? marked(doc.src, marks, true) : doc.src}
              {!isImage && showEasier && doc.easier?.label && <span className="da-easier-label">{doc.easier.label}</span>}
            </div>
            {fr && (
              <div className="da-fr-label" lang="fr">
                <b>{F.label || pack.fr.label}</b>
                {pack.fr.note && <span>{pack.fr.note}</span>}
              </div>
            )}
            {images.map((im, i) => (
              <div key={i} className="da-imgblock">
                {im.label && <div className="da-imglabel">{im.label}</div>}
                <a className="da-imglink" href={imgSrc(im.file)} target="_blank" rel="noopener noreferrer">
                  <img src={imgSrc(im.file)} alt={im.alt || ''} loading={i ? 'lazy' : undefined} />
                </a>
                {showEasier && im.describe && (
                  <div className="da-describe">
                    <div className="da-describe-head">{CHROME.picture}</div>
                    <p>{im.describe}</p>
                  </div>
                )}
              </div>
            ))}
            {isImage && fr && F.describe && (
              <div className="da-describe" lang="fr"><p>{F.describe}</p></div>
            )}
            {!isImage && (
              <div className="da-text" lang={fr ? 'fr' : 'en'}>
                {body.map((p, i) => <p key={`${fr ? 'f' : showEasier ? 'e' : 'o'}${i}`}>{marks ? marked(p, marks) : p}</p>)}
              </div>
            )}
            {ww?.text && (
              <div className="da-ww" lang={fr ? 'fr' : 'en'}>
                {ww.title && <b className="da-ww-title">{ww.title}</b>}
                <p>{ww.text}</p>
              </div>
            )}
            {doc.licence?.text && <p className="da-licence">{doc.licence.text}</p>}
          </figure>
          {annOpen && canAnnotate && <AnnotatePanel pack={pack} doc={doc} fr={fr} />}
        </div>

        {walkOpen && (
          <section className="da-walk" ref={walkRef} tabIndex={-1} aria-label={pack.walk_name} lang={fr ? 'fr' : 'en'}>
            <div className="da-walk-top">
              <div className="da-walk-name" lang="en">{pack.walk_name}</div>
              <div className="da-dots" aria-hidden="true">
                {walkSteps.map((_, i) => <span key={i} className={i < at ? 'da-dot done' : i === at ? 'da-dot now' : 'da-dot'} />)}
              </div>
            </div>
            {at < walkSteps.length ? (
              <div className="da-step" key={`${at}${fr ? 'f' : ''}`} aria-live="polite">
                <div className="da-tag">{step.tag}</div>
                <div className="da-stepline">{step.step}</div>
                {say && <p className="da-say">{say}</p>}
                {qs.length > 0 && (
                  <div className="da-ask">
                    <div className="da-ask-head">{asks}</div>
                    {qs.map((q, i) => (
                      <p key={i}>{q.n != null && <b className="da-qn">{q.n}.</b>} {q.text}
                        {q.mode === 'out loud' && <span className="da-loud"> · {CHROME.outLoud}</span>}</p>
                    ))}
                  </div>
                )}
                {showUmb && (
                  <div className="da-umb-wrap">
                    <button type="button" className="da-btn" aria-expanded={umbOpen} aria-controls="da-umbrellas"
                            onClick={() => setUmbOpen(o => !o)}>
                      <span aria-hidden="true" className="da-ico">{umbOpen ? '−' : '+'}</span>{q4Label(pack)}
                    </button>
                    {umbOpen && <Umbrellas u={card} />}
                  </div>
                )}
                {/* The Threads list, when a step's words point at a thread (US). */}
                {!fr && <RefButtons text={stepText} refs={refs?.threads ? { threads: refs.threads } : null} idBase="da-ref" />}
                {line && (
                  <div className="guide-says da-bk" role="note">
                    {portrait && <img className="guide-face" src={`/${portrait}`} alt="" />}
                    <p>{line}</p>
                  </div>
                )}
                {/* A tip the step carries (Global v3: NO NAME ON IT?, BK 10:26), under the line. */}
                {tip && (
                  <aside className="da-tip" aria-label={tip.title}>
                    {tip.title && <div className="da-tip-title">{tip.title}</div>}
                    {tip.text.map((t, i) => <p key={i}>{t}</p>)}
                  </aside>
                )}
              </div>
            ) : (
              <div className="da-step" key={`close${fr ? 'f' : ''}`} aria-live="polite">
                <div className="guide-says da-bk" role="note">
                  {portrait && <img className="guide-face" src={`/${portrait}`} alt="" />}
                  <p>{close}</p>
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
.da-btn[aria-expanded=true],.da-btn[aria-pressed=true]{border-color:var(--gold);box-shadow:inset 0 0 0 1px var(--gold)}
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
.da-printed{color:#2c2110;font-size:16px;line-height:1.55;font-style:italic;margin:0 0 14px;padding:12px 16px;border-radius:8px;
  background:linear-gradient(160deg,#f8f0da,#ecdeb8);border:1px solid rgba(60,44,18,.3)}
.da-note p{margin:0;font-style:normal}
.da-note-title{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.1em;font-size:13.5px;font-style:normal;color:#5a4210;font-weight:700;margin-bottom:4px}
.da-umb-group{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.12em;font-size:13.5px;color:var(--gold-lit);margin:10px 0 6px;padding-bottom:3px;border-bottom:1px solid var(--edge)}
.da-imgblock+.da-imgblock{margin-top:18px}
.da-imglabel{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.1em;font-size:14px;color:#5a4210;font-weight:700;margin-bottom:6px}
.da-qn{color:var(--gold);margin-right:2px}
.da-ask p+p{margin-top:8px}
.da-umb-wrap{margin:4px 0 6px}
.da-umb{margin-top:10px;background:var(--canvas);border:1px solid var(--arena-choice-edge);border-radius:10px;padding:12px 14px}
.da-umb-title{font-family:'Barlow Condensed',sans-serif;font-size:20px;letter-spacing:.1em;color:var(--gold);margin-bottom:4px}
.da-umb-intro{color:var(--white);font-size:15.5px;line-height:1.5;margin:0 0 10px}
.da-umb-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:9px}
.da-umb-body{border-left:3px solid var(--gold);padding:2px 0 2px 10px}
.da-umb-name{font-family:'Barlow Condensed',sans-serif;font-size:17px;letter-spacing:.06em;color:var(--white);font-weight:700}
.da-umb-n{display:inline-block;min-width:24px;margin-right:2px;color:var(--gold)}
.da-umb-q{color:var(--white);font-size:15px;line-height:1.45}
.da-umb-issues{color:var(--gold-lit);font-size:14.5px;line-height:1.45;margin-top:2px}
.da-umb-defs{margin:4px 0 0;display:flex;flex-direction:column;gap:4px}
.da-umb-defs div{color:var(--white);font-size:14.5px;line-height:1.45}
.da-umb-defs dt{display:inline;color:var(--gold-lit);font-weight:600}
.da-umb-defs dt::after{content:': '}
.da-umb-defs dd{display:inline;margin:0}
.da-tip{margin:-6px 0 18px;background:var(--card-lit);border:1px solid var(--arena-choice-edge);border-left:4px solid var(--gold);border-radius:8px;padding:10px 13px}
.da-tip-title{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.1em;font-size:14px;color:var(--gold);font-weight:700;margin-bottom:4px}
.da-tip p{color:var(--white);font-size:15.5px;line-height:1.5;margin:0}
.da-tip p+p{margin-top:6px}
.da-umb-close{color:var(--white);font-size:15px;line-height:1.5;margin:10px 0 0}
.da-docnav{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:22px 0 0;max-width:860px}
.da-docnav .btn-ghost{min-height:44px;font-size:16px;background:var(--card);border-style:solid;border-color:var(--arena-choice-edge)}
.da-docnav .btn-ghost:disabled{visibility:hidden}
.da-fr-label{margin:-4px 0 14px;padding:8px 12px;border-radius:6px;background:rgba(255,255,255,.5);border:1px solid rgba(60,44,18,.3);color:#2c2110;font-size:15px;line-height:1.5}
.da-fr-label b{display:block;color:#5a4210}
.da-ww{margin:16px 0 4px;padding:10px 13px;border-radius:6px;background:#efe2bf;border:1px solid rgba(60,44,18,.35);border-left:4px solid #8a6a1f}
.da-ww-title{display:block;color:#2c2110;font-family:'Barlow Condensed',sans-serif;letter-spacing:.08em;font-size:15px;margin-bottom:3px}
.da-ww p{color:#2c2110;font-size:16.5px;line-height:1.6;margin:0}
/* The model notes, drawn on the page (BK 2026-10-02 14:05: hi-vis against the parchment). A highlighter
   yellow under every mark, and dark green ink for its shape. Orange stays growth-only (BK 09-26).
   Each mark has its own shape and a number, never colour alone. */
.da-mk{background:#FFE34A;color:#1d1608;padding:1px 3px;border-radius:3px;box-decoration-break:clone;-webkit-box-decoration-break:clone}
.da-mk-box{outline:2.5px solid #0A6B34;outline-offset:1px;border-radius:1px}
.da-mk-circle{border:2.5px solid #0A6B34;border-radius:999px;padding:0 7px}
.da-mk-underline{text-decoration:underline solid #0A6B34;text-decoration-thickness:3px;text-underline-offset:4px}
.da-mk-margin{text-decoration:underline wavy #0A6B34;text-decoration-thickness:2px;text-underline-offset:5px}
.da-mk-n{font-family:'Outfit',sans-serif;font-style:normal;font-weight:700;font-size:11.5px;color:#fff;background:#0A6B34;border-radius:999px;
  padding:1px 5px;margin-left:3px;vertical-align:super;line-height:1}
.da-ann{margin:16px 0 0;background:var(--card);border:1px solid var(--arena-choice-edge);border-left:4px solid var(--gold);border-radius:10px;padding:14px 16px;box-shadow:0 6px 18px rgba(0,0,0,.28)}
.da-ann-title{font-family:'Barlow Condensed',sans-serif;font-size:22px;letter-spacing:.1em;text-transform:uppercase;color:var(--gold);margin-bottom:8px}
.da-ann-method{list-style:none;margin:0 0 14px;padding:0;display:flex;flex-direction:column;gap:7px}
.da-ann-method li{display:flex;gap:10px;align-items:baseline;color:var(--white);font-size:16.5px;line-height:1.5}
.da-ann-n{flex:0 0 auto;min-width:24px;height:24px;border-radius:50%;background:var(--gold);color:var(--canvas);font-weight:700;font-size:13.5px;display:inline-flex;align-items:center;justify-content:center}
.da-ann-tag{font-family:'Barlow Condensed',sans-serif;letter-spacing:.08em;color:var(--gold-lit);font-weight:700}
.da-ann-head{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.1em;font-size:15px;color:var(--gold);font-weight:700;margin:4px 0 2px}
.da-ann-intro{color:var(--grey);font-size:15.5px;line-height:1.5;margin:0 0 10px}
.da-ann-notes{list-style:none;margin:0 0 6px;padding:0;display:flex;flex-direction:column;gap:10px}
.da-ann-notes li{display:flex;gap:10px;align-items:flex-start;background:var(--card-lit);border:1px solid var(--edge);border-radius:8px;padding:9px 11px}
.da-ann-notes p{color:var(--white);font-size:16px;line-height:1.5;margin:3px 0 0}
.da-ann-key{flex:0 0 auto;min-width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;
  color:#1d1608;background:#FFE34A;border-radius:4px;padding:0}
.da-ann-key.da-mk-box{outline:2.5px solid #2FBF71;outline-offset:1px;border-radius:1px}
.da-ann-key.da-mk-circle{border:2.5px solid #2FBF71;border-radius:50%}
.da-ann-key.da-mk-underline{box-shadow:inset 0 -4px 0 #0A6B34}
.da-ann-key.da-mk-margin{text-decoration:underline wavy #0A6B34;text-decoration-thickness:2px;text-underline-offset:3px}
.da-ann-mark{font-family:'Barlow Condensed',sans-serif;letter-spacing:.1em;color:var(--gold-lit);font-size:14.5px}
.da-ann-where{color:var(--white);font-style:italic;font-size:15.5px}
.da-ann-oe{margin-top:12px;padding-top:10px;border-top:1px solid var(--edge)}
.da-ann-oe p{color:var(--white);font-size:16px;line-height:1.55;margin:2px 0 0}
@media (prefers-reduced-motion:no-preference){
  .da-step{animation:da-in .22s var(--ease-calm,ease-out) both}
  @keyframes da-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
  .da-dot{transition:transform .14s var(--ease-settle),background-color .12s}
}
`
