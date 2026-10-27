// ── THROWBACK ─────────────────────────────────────────────────────────────
// The other cut through the Threads. The map runs one thread forward through time;
// Throwback stops at one moment and shows where all seven stood at once, plus what it
// was like to be a kid that year. Leo's order 2026-10-26 22:01; BK ruled it 22:38–22:40
// on josh-proof-2026-10-26-throwback-scratch.pdf. Every ruling below is his:
//
//   • "Throwback is the name" — the label is a data slot (name.label), never typed here.
//   • "I agree with two" — it lives INSIDE the US Threads lane as a second view beside the
//     map. The US door stays at four lanes. Links #/us/throwback and #/us/throwback/<year>.
//   • "Three. Okay, I'll go with that" — ENTRY IS THE ROOM. The period room is the
//     background and the paper opens big in the foreground over it. The panel is not a
//     thumbnail of the paper; it is the picture on the wall, and tapping it opens the paper.
//   • "badge next to it, call out" — the OI fact rides with the reading, on the opened
//     story, with a badge beside it.
//   • "Yes, open on day zero" — both frames of the unit in progress open on Day 0; eras
//     past the current unit stay locked and say so, rather than being hidden.
//
// Josh owns the container only: era ids, the panel rectangle, unlock flags, skin ids and
// image paths. Every word a student reads comes from the authoring desk through Danny
// (the file's own _rules say so). Nothing here is scored, saved or typed-and-kept.
//
// ART IS NOT ASSUMED. The room, the silhouettes and a card's pictures may not exist yet
// or may be sitting in Danny's gate; a missing image renders as its own description rather
// than a broken frame, so the room is readable before a single picture has cleared.
import { useEffect, useMemo, useState } from 'react'

const assetUrl = p => (p && /^(https?:)?\//.test(p) ? p : p ? `/content/${String(p).replace(/^\.?\//, '')}` : null)

export function useThrowback(course, preview = false) {
  const [data, setData] = useState(null)
  // Dark by default. `?preview=throwback` opens it for a reviewer with the link, exactly as
  // the Office does, so BK can play it before a word of it is blessed.
  const ref = ((course?.throwback?.published === true || preview) && course?.throwback?.content_ref) || null
  useEffect(() => {
    if (!ref) { setData(false); return }
    let live = true
    fetch(`/${String(ref).replace(/^\//, '')}`).then(r => (r.ok ? r.json() : null))
      .then(d => { if (live) setData(d || false) }).catch(() => live && setData(false))
    return () => { live = false }
  }, [ref])
  return data
}

// An era a kid can open: the file says `open`, OR it belongs to the unit the class is in
// (BK: both frames of the unit in progress open on Day 0). Anything later stays shut and
// says "not yet" rather than vanishing, so the shape of the course is visible.
const isOpen = (era, unitNumbers) =>
  era?.status === 'open' || (era?.unit && unitNumbers.includes(String(era.unit)))

// A picture, or the words that describe it. Never a broken frame.
function Figure({ src, alt, caption, credit, label, className = '' }) {
  const [failed, setFailed] = useState(false)
  const url = assetUrl(src)
  return (
    <figure className={`tb-fig ${className}`}>
      {url && !failed
        ? <img src={url} alt={alt || ''} loading="lazy" onError={() => setFailed(true)} />
        : <div className="tb-fig-missing" role="img" aria-label={alt || 'Picture not available yet'}>
            <span className="tb-fig-tag">Picture not here yet</span>
            {alt && <p>{alt}</p>}
          </div>}
      {(caption || credit || label) && (
        <figcaption>
          {caption}
          {credit && <span className="tb-credit">{credit}</span>}
          {label && <span className="tb-label">{label}</span>}
        </figcaption>
      )}
    </figure>
  )
}

// One story, opened: the body, its pictures, its source line, and the OI fact in a badge
// beside the reading (BK: "badge next to it, call out").
function Story({ card, onBack, words }) {
  return (
    <article className="tb-story">
      <button type="button" className="tb-story-back" onClick={onBack}>&larr; {words.backToPage}</button>
      <h3 className="tb-story-head">{card.headline}</h3>
      {card.lede && <p className="tb-lede">{card.lede}</p>}
      {(card.body || []).map((p, i) => <p key={i} className="tb-body">{p}</p>)}
      {(card.images || []).map((im, i) => (
        <Figure key={i} src={im.src} alt={im.alt} caption={im.caption} credit={im.credit}
                label={im.kind === 'archival' ? 'Archival' : im.kind === 'ai' ? 'Made for this room' : null} />
      ))}
      {card.oi?.fact && (
        <aside className="tb-oi" aria-label={words.oiBadge}>
          <span className="tb-oi-badge">{words.oiBadge}</span>
          <p>{card.oi.fact}</p>
          {card.oi.source_ref && <span className="tb-oi-src">{card.oi.source_ref}</span>}
        </aside>
      )}
      {card.source_line && <p className="tb-source">{card.source_line}</p>}
    </article>
  )
}

// The paper, open and big in the foreground over the room.
function Paper({ era, onClose, words }) {
  const [openCard, setOpenCard] = useState(null)
  const cards = (era.cards || []).filter(c => c.unlocked !== false)
  const shut = (era.cards || []).filter(c => c.unlocked === false).length
  const card = openCard ? cards.find(c => c.id === openCard) : null
  return (
    <div className="tb-paper" role="dialog" aria-modal="true" aria-label={era.skin?.masthead || words.paper}>
      <div className="tb-paper-sheet">
        <header className="tb-masthead">
          <h2>{era.skin?.masthead}</h2>
          {era.skin?.edition_line && <p className="tb-edition">{era.skin.edition_line}</p>}
          <button type="button" className="tb-close" onClick={onClose} aria-label={words.closePaper}>&times;</button>
        </header>
        {card
          ? <Story card={card} onBack={() => setOpenCard(null)} words={words} />
          : (
            <>
              <div className="tb-front">
                {cards.map(c => (
                  <button key={c.id} type="button" className={`tb-item${c.kind === 'thread' ? ' thread' : ''}`}
                          onClick={() => setOpenCard(c.id)}>
                    <span className="tb-item-head">{c.headline}</span>
                    {c.lede && <span className="tb-item-lede">{c.lede}</span>}
                    <span className="tb-item-go">{words.readIt}</span>
                  </button>
                ))}
              </div>
              {shut > 0 && <p className="tb-shut">{words.notYetCards(shut)}</p>}
            </>
          )}
      </div>
    </div>
  )
}

// One era: the room, with the paper on the wall. Tapping the picture opens the paper.
function Room({ era, onOpenPaper, paperOpen, onClose, words }) {
  return (
    <div className="tb-room">
      <div className="tb-room-art">
        <Figure src={era.room?.image} alt={era.room?.image_alt} caption={era.room?.caption} className="tb-room-fig" />
        <button type="button" className="tb-panel" onClick={onOpenPaper} aria-label={words.openPaper(era.label || era.year)}>
          <span className="tb-panel-word">{era.skin?.masthead || words.paper}</span>
          <span className="tb-panel-go">{words.openIt}</span>
        </button>
      </div>
      <div className="tb-room-side">
        {era.silhouettes && (
          <Figure src={era.silhouettes.image} alt={era.silhouettes.image_alt}
                  caption={era.silhouettes.caption} className="tb-sil" />
        )}
        {era.silhouettes?.attire_note && <p className="tb-note">{era.silhouettes.attire_note}</p>}
        {era.who_is_not_in_this_room && (
          <aside className="tb-absent">
            <span className="tb-absent-tag">{words.whoIsNotHere}</span>
            <p>{era.who_is_not_in_this_room}</p>
          </aside>
        )}
        {era.take_it_with_you && <p className="tb-take">{era.take_it_with_you}</p>}
      </div>
      {paperOpen && <Paper era={era} onClose={onClose} words={words} />}
    </div>
  )
}

export function ThrowbackView({ course, data, unitNumbers, year, onPickYear, words }) {
  const eras = useMemo(() => (data?.eras || []), [data])
  const [paperOpen, setPaperOpen] = useState(false)
  const era = useMemo(() => eras.find(e => String(e.year) === String(year)) || null, [eras, year])
  useEffect(() => { setPaperOpen(false) }, [year])
  if (data === null) return <div className="loading">{words.opening}</div>
  if (!data || !eras.length) return null

  return (
    <div className="throwback">
      <p className="tb-sub">{data.name?.subtitle}</p>
      <div className="tb-years">
        {eras.map(e => {
          const open = isOpen(e, unitNumbers)
          return open ? (
            <button key={e.id} type="button" className={`tb-year${String(e.year) === String(year) ? ' on' : ''}`}
                    onClick={() => onPickYear(String(e.year))}>
              <span className="tb-year-n">{e.year}</span>
              {e.label && <span className="tb-year-label">{e.label}</span>}
            </button>
          ) : (
            <div key={e.id} className="tb-year off">
              <span className="tb-year-n">{e.year}</span>
              <span className="tb-year-label">{words.notYet}</span>
            </div>
          )
        })}
      </div>
      {era && isOpen(era, unitNumbers)
        ? <Room era={era} words={words} paperOpen={paperOpen}
                onOpenPaper={() => setPaperOpen(true)} onClose={() => setPaperOpen(false)} />
        : <p className="tb-pick">{words.pickOne}</p>}
    </div>
  )
}

export const THROWBACK_WORDS = {
  opening: 'Opening…',
  paper: 'The front page',
  openIt: 'Open the paper',
  readIt: 'Read it',
  backToPage: 'Back to the front page',
  closePaper: 'Close the paper',
  notYet: 'Not yet',
  pickOne: 'Pick a year to step into.',
  whoIsNotHere: 'Who is not in this room',
  oiBadge: 'Outside Information',
  openPaper: where => `Open the front page for ${where}`,
  notYetCards: n => `${n} more ${n === 1 ? 'story opens' : 'stories open'} as the class gets there.`,
}

export const THROWBACK_STYLES = `
/* ---------- THROWBACK ---------- */
/* The two views of the Threads lane. One row of tabs, not a new lane: the door stays at four. */
.tb-switch{display:flex;gap:8px;margin:0 0 16px}
.tb-tab{padding:8px 16px;border-radius:999px;background:var(--card);border:1px solid var(--edge);color:var(--grey);
  font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.08em;font-size:15px;cursor:pointer}
.tb-tab:hover{border-color:var(--gold);color:var(--white)}
.tb-tab.on{background:var(--gold);border-color:var(--gold);color:var(--canvas);font-weight:600}
.throwback{display:flex;flex-direction:column;gap:18px}
.tb-sub{color:var(--grey);font-size:17px;line-height:1.55;margin:0;max-width:760px}
.tb-years{display:flex;flex-wrap:wrap;gap:10px}
.tb-year{display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding:11px 16px;border-radius:10px;
  background:var(--card);border:1px solid var(--edge);color:var(--white);cursor:pointer;font-family:'Outfit',sans-serif}
.tb-year:hover{border-color:var(--gold);background:var(--card-lit)}
.tb-year.on{border-color:var(--gold);background:var(--card-lit)}
.tb-year.off{opacity:.55;cursor:default}
.tb-year-n{font-family:'Barlow Condensed',sans-serif;font-size:23px;letter-spacing:.04em}
.tb-year-label{color:var(--grey);font-size:14px}
.tb-pick{color:var(--grey);font-size:17px}
.tb-room{position:relative;display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:18px}
@media (max-width:880px){.tb-room{grid-template-columns:1fr}}
.tb-room-art{position:relative}
.tb-fig{margin:0}
.tb-fig img{display:block;width:100%;height:auto;border-radius:12px;border:1px solid var(--edge)}
.tb-fig figcaption{color:var(--grey);font-size:14px;line-height:1.45;margin-top:6px}
.tb-credit,.tb-label{display:block;color:var(--dim);font-size:13px;margin-top:2px}
.tb-fig-missing{border:1px dashed var(--edge);border-radius:12px;padding:16px;background:var(--card);color:var(--grey);font-size:15px;line-height:1.5}
.tb-fig-tag{display:inline-block;font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.1em;
  font-size:12px;color:var(--canvas);background:var(--grey);padding:2px 7px;border-radius:4px;margin-bottom:8px}
/* The panel on the wall: the way into the paper, sitting on the room art. */
.tb-panel{position:absolute;left:50%;top:34%;transform:translate(-50%,-50%);display:flex;flex-direction:column;
  align-items:center;gap:4px;padding:14px 20px;border-radius:10px;cursor:pointer;
  background:color-mix(in srgb,var(--canvas) 72%,transparent);border:2px solid var(--gold);color:var(--white)}
.tb-panel:hover{background:var(--canvas)}
.tb-panel-word{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.08em;font-size:20px}
.tb-panel-go{color:var(--gold);font-size:14px}
.tb-room-side{display:flex;flex-direction:column;gap:12px}
.tb-note,.tb-take{color:var(--grey);font-size:15px;line-height:1.5;margin:0}
.tb-absent{border-left:3px solid var(--arena-signal);padding:10px 13px;border-radius:0 8px 8px 0;
  background:color-mix(in srgb,var(--arena-signal) 10%,transparent)}
.tb-absent-tag{display:block;font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.1em;
  font-size:12px;color:var(--arena-signal);margin-bottom:4px}
.tb-absent p{margin:0;color:var(--white);font-size:15px;line-height:1.5}
/* The paper, big in the foreground over the room. */
.tb-paper{position:fixed;inset:0;z-index:40;background:rgba(6,10,18,.82);display:flex;align-items:flex-start;
  justify-content:center;padding:22px 14px;overflow:auto}
.tb-paper-sheet{width:min(840px,100%);background:#F3EBD8;color:#17130D;border-radius:6px;padding:20px 22px 26px;
  box-shadow:0 20px 60px rgba(0,0,0,.6)}
.tb-masthead{position:relative;border-bottom:3px double #17130D;padding-bottom:10px;margin-bottom:14px}
.tb-masthead h2{font-family:'Playfair Display','Barlow Condensed',serif;font-size:clamp(26px,5vw,44px);
  letter-spacing:.02em;margin:0;text-align:center;color:#17130D}
.tb-edition{text-align:center;margin:4px 0 0;font-size:14px;color:#5A4C39}
.tb-close{position:absolute;right:0;top:0;background:none;border:0;font-size:30px;line-height:1;cursor:pointer;color:#17130D}
.tb-front{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}
.tb-item{text-align:left;background:none;border:0;border-top:1px solid #C9BCA2;padding:12px 2px 14px;cursor:pointer;
  display:flex;flex-direction:column;gap:5px;color:#17130D;font-family:'Libre Baskerville',Georgia,serif}
.tb-item:hover .tb-item-head{text-decoration:underline}
.tb-item-head{font-size:19px;line-height:1.25;font-weight:700}
.tb-item-lede{font-size:15px;line-height:1.5;color:#3A3123}
.tb-item-go{font-size:13px;color:#7A1F12;letter-spacing:.04em}
.tb-shut{margin:14px 0 0;font-size:14px;color:#5A4C39;font-style:italic}
.tb-story-back{background:none;border:0;cursor:pointer;color:#7A1F12;font-size:15px;padding:0 0 10px}
.tb-story-head{font-family:'Playfair Display',Georgia,serif;font-size:clamp(22px,3.4vw,30px);margin:0 0 8px;color:#17130D}
.tb-lede{font-size:17px;line-height:1.55;font-weight:600;margin:0 0 10px}
.tb-body{font-family:'Libre Baskerville',Georgia,serif;font-size:16px;line-height:1.65;margin:0 0 10px}
.tb-story .tb-fig img{border-radius:3px;border:1px solid #C9BCA2}
.tb-story .tb-fig figcaption,.tb-story .tb-credit,.tb-story .tb-label{color:#5A4C39}
.tb-story .tb-fig-missing{background:#E8DFC8;border-color:#C9BCA2;color:#5A4C39}
.tb-oi{border:2px solid #7A1F12;border-radius:6px;padding:12px 14px;margin:14px 0 10px;background:#EFE4CB}
.tb-oi-badge{display:inline-block;font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.1em;
  font-size:12px;font-weight:700;color:#F3EBD8;background:#7A1F12;padding:3px 9px;border-radius:4px;margin-bottom:7px}
.tb-oi p{margin:0;font-size:16px;line-height:1.55}
.tb-oi-src{display:block;margin-top:6px;font-size:13px;color:#5A4C39}
.tb-source{font-size:13px;color:#5A4C39;margin:10px 0 0}
`
