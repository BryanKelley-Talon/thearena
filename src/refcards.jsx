// ============================================================
// THE POP-UP LISTS — wherever a screen tells a kid to use the Six Umbrellas, the Civic Principles
// or the Threads, a button opens that list right there (BK 2026-10-05 22:59: "if something in
// atlas or doc assist suggests an EI Umbrella or Civic Principle OR Thread...there has to be a
// button to pop that list up for the user").
//
// One renderer (Doc Assist's step-5 card, BK 10/1) and one detector, used by Doc Assist, the
// Atlas walk and the Writing Lab. The lists come from the desks' signed files: Global's Six
// Umbrellas and US's Civic Principles from the course's Doc Assist pack, the Threads from Sam's
// Threads map file. Nothing is retyped here.
// ============================================================
import { useEffect, useState } from 'react'

export const REF_WORDS = { threads: 'The Threads' }

const RX = {
  umbrellas: /umbrella/i,
  civic: /civic principle|principle on your card|the principles?\b/i,
  threads: /\bthreads?\b/i,
}
export const mentions = (text, kind) => RX[kind].test(String(text || ''))

export function RefCard({ card, id }) {
  return (
    <div className="da-umb" id={id}>
      <div className="da-umb-title">{card.title}</div>
      {card.intro && <p className="da-umb-intro">{card.intro}</p>}
      <ol className="da-umb-list">
        {(card.items || []).map((it, i, all) => (
          <li key={`${it.n}-${i}`}>
            {it.group && it.group !== all[i - 1]?.group && <div className="da-umb-group">{it.group}</div>}
            <div className="da-umb-body">
              <div className="da-umb-name"><span className="da-umb-n">{it.n}</span>{it.name}</div>
              {it.question && <div className="da-umb-q">{it.question}</div>}
              {Array.isArray(it.issue_defs) && it.issue_defs.length
                ? <dl className="da-umb-defs">{it.issue_defs.map(d => <div key={d.name}><dt>{d.name}</dt><dd>{d.definition}</dd></div>)}</dl>
                : it.issues && <div className="da-umb-issues">{it.issues}</div>}
            </div>
          </li>
        ))}
      </ol>
      {(card.close || []).map((c, i) => <p key={i} className="da-umb-close">{c}</p>)}
    </div>
  )
}

// The course's lists, each with the label its button carries.
export function useRefCards(course) {
  const [refs, setRefs] = useState({})
  useEffect(() => {
    if (!course) { setRefs({}); return }
    let live = true
    const get = ref => fetch(`/content/${String(ref).replace(/^content\//, '')}`).then(r => (r.ok ? r.json() : null)).catch(() => null)
    const daRef = (course.units || []).map(u => u.doc_assist).filter(d => d?.published).map(d => d.content_ref).pop()
    const thRef = (course.threads || []).find(t => t.published)?.content_ref
    Promise.all([daRef ? get(daRef) : null, thRef ? get(thRef) : null]).then(([pack, th]) => {
      if (!live) return
      const out = {}
      if (pack?.umbrellas) out.umbrellas = { card: pack.umbrellas, label: pack.labels?.umbrellas || pack.umbrellas.button }
      if (pack?.q4_card) out.civic = { card: pack.q4_card, label: pack.labels?.q4_card || pack.q4_card.button }
      // The Threads file in either shape: v2 lines/subs (10/5) or the 9/27 threads/arcs.
      const lines = th?.lines || th?.threads
      if (lines?.length) out.threads = {
        label: REF_WORDS.threads,
        card: { title: REF_WORDS.threads, items: lines.map(t => ({ n: t.number, name: t.name, question: t.question, issues: (t.subs || t.arcs || []).map(a => a.name).join(' · ') || null })) },
      }
      setRefs(out)
    })
    return () => { live = false }
  }, [course])
  return refs
}

// Buttons for every list the text points at. Each opens and closes its list in place.
export function RefButtons({ text, refs, idBase = 'ref' }) {
  const kinds = ['umbrellas', 'civic', 'threads'].filter(k => refs?.[k] && mentions(text, k))
  const [open, setOpen] = useState(null)
  useEffect(() => { setOpen(null) }, [text])
  if (!kinds.length) return null
  return (
    <div className="da-umb-wrap ref-wrap">
      {kinds.map(k => (
        <button key={k} type="button" className="da-btn" aria-expanded={open === k} aria-controls={`${idBase}-${k}`}
                onClick={() => setOpen(o => (o === k ? null : k))}>
          <span aria-hidden="true" className="da-ico">{open === k ? '−' : '+'}</span>{refs[k].label}
        </button>
      ))}
      {open && <RefCard card={refs[open].card} id={`${idBase}-${open}`} />}
    </div>
  )
}

export const REF_STYLES = `
.ref-wrap{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-start;margin-top:8px}
.ref-wrap .da-umb{flex-basis:100%}
.atlas-walk .da-umb{max-height:46vh;overflow:auto}
`
