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
const Quote = ({ text, cite }) => (
  <blockquote className="tb-quote"><p>{text}</p>{cite && <cite>{cite}</cite>}</blockquote>
)

// Every block below is a field Sam wrote and Danny cleared. The headings are the
// data's own (_label, counter_voice.label, the row categories, now_label) - this
// component adds no words of its own to the page.
function Story({ card, onBack, words, nowLabel }) {
  const body = card.body || []
  const said = card.said || []
  const cv = card.counter_voice
  const census = card.census || []
  const rows = card.rows || []
  return (
    <article className="tb-story">
      <button type="button" className="tb-story-back" onClick={onBack}>&larr; {words.backToPage}</button>
      {card.label && <p className="tb-kicker">{card.label}</p>}
      <h3 className="tb-story-head">{card.headline}</h3>
      {(card.name || card.term_line) && (
        <p className="tb-byline">{[card.name, card.term_line].filter(Boolean).join(' \u00b7 ')}</p>
      )}
      {card.lede && <p className="tb-lede">{card.lede}</p>}
      {card.image?.src && (
        <Figure src={card.image.src} alt={card.image.alt} caption={card.image.caption}
                credit={card.image.credit}
                label={card.image.kind === 'archival' ? 'Archival' : card.image.kind === 'ai' ? 'Made for this room' : null} />
      )}
      {body.map((t, i) => <p key={i} className="tb-body">{t}</p>)}
      {said.length > 0 && <div className="tb-said">{said.map((q, i) => <Quote key={i} text={q.text} cite={q.cite} />)}</div>}
      {card.record_line && (
        <aside className="tb-record">
          <p>{card.record_line}</p>
          {card.record_src && <span className="tb-src">{card.record_src}</span>}
        </aside>
      )}
      {cv && (
        <aside className="tb-counter">
          {cv.label && <span className="tb-tag">{cv.label}</span>}
          {(cv.who || cv.when) && <p className="tb-who">{[cv.who, cv.when].filter(Boolean).join(' \u00b7 ')}</p>}
          {cv.line && <blockquote className="tb-quote"><p>{cv.line}</p></blockquote>}
          {cv.after && <p className="tb-after">{cv.after}</p>}
          {cv.source_line && <span className="tb-src">{cv.source_line}</span>}
        </aside>
      )}
      {census.length > 0 && (
        <dl className="tb-census">
          {census.map((r, i) => (
            <div key={i} className="tb-census-row"><dt>{r.category}</dt><dd>{r.value}</dd></div>
          ))}
        </dl>
      )}
      {card.leaves_out && <aside className="tb-leaves"><p>{card.leaves_out}</p></aside>}
      {rows.length > 0 && (
        <div className="tb-then">
          {rows.map((r, i) => (
            <section key={i} className="tb-then-row">
              <h4>{r.heading}</h4>
              <p className="tb-then-then">{r.then}</p>
              {r.now && (
                <p className="tb-then-now">
                  {nowLabel && <span className="tb-now-tag">{nowLabel}</span>}{r.now}
                </p>
              )}
            </section>
          ))}
        </div>
      )}
      {card.not_in_room && (
        <aside className="tb-absent">
          <span className="tb-absent-tag">{words.whoIsNotHere}</span>
          <p>{card.not_in_room}</p>
        </aside>
      )}
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
      {card.footnote && <p className="tb-foot">{card.footnote}</p>}
      {card.source_line && <p className="tb-source">{card.source_line}</p>}
    </article>
  )
}


function Paper({ era, onClose, words, nowLabel }) {
  const [openCard, setOpenCard] = useState(null)
  // BK, 2026-10-27: "I want nothing locked on this paper...open the thing up."
  // Every story on the front page is readable. No held cards, no count of what
  // is still shut, no "as the class gets there".
  const cards = (era.cards || []).filter(c => String(c.headline || '').trim())
  const card = openCard ? cards.find(c => c.id === openCard) : null
  const [lead, ...rest] = cards
  return (
    <div className="tb-paper" role="dialog" aria-modal="true" aria-label={era.skin?.masthead || words.paper}>
      <div className="tb-paper-sheet">
        <header className="tb-masthead">
          <h2>{era.skin?.masthead}</h2>
          {/* Sam's _dateline is the real one - town and month. skin.edition_line is
              the old self-describing placeholder BK called out; it is the fallback only. */}
          {(era.dateline || era.skin?.edition_line) &&
            <p className="tb-edition">{era.dateline || era.skin.edition_line}</p>}
          <button type="button" className="tb-close" onClick={onClose} aria-label={words.closePaper}>&times;</button>
        </header>
        {era.moment && !card && <p className="tb-moment">{era.moment}</p>}
        {!card && era.front_image?.src && (
          <Figure className="tb-cut" src={era.front_image.src} alt={era.front_image.alt}
                  caption={era.front_image.caption} credit={era.front_image.credit}
                  label={era.front_image.kind === 'archival' ? 'Archival'
                       : era.front_image.kind === 'ai' ? 'Made for this room' : null} />
        )}
        {card
          ? <Story card={card} onBack={() => setOpenCard(null)} words={words} nowLabel={nowLabel} />
          : (
            <div className="tb-front">
              {lead && (
                <button type="button" className="tb-item tb-lead" onClick={() => setOpenCard(lead.id)}>
                  <span className="tb-item-head">{lead.headline}</span>
                  {lead.lede && <span className="tb-item-lede">{lead.lede}</span>}
                  <span className="tb-item-go">{words.readIt}</span>
                </button>
              )}
              {rest.length > 0 && (
                <div className="tb-cols">
                  {rest.map(c => (
                    <button key={c.id} type="button" className={`tb-item${c.kind === 'thread' ? ' thread' : ''}`}
                            onClick={() => setOpenCard(c.id)}>
                      <span className="tb-item-head">{c.headline}</span>
                      {c.lede && <span className="tb-item-lede">{c.lede}</span>}
                      <span className="tb-item-go">{words.readIt}</span>
                    </button>
                  ))}
                </div>
              )}
              {(era.what_changed?.rows || []).length > 0 && (
                <section className="tb-changed">
                  {era.what_changed.rows.map((r, i) => (
                    <div key={i} className="tb-changed-row">
                      <h4>{r.category}</h4>
                      <p>{r.text}</p>
                    </div>
                  ))}
                </section>
              )}
            </div>
          )}
      </div>
    </div>
  )
}


function Room({ era, onOpenPaper, paperOpen, onClose, words, nowLabel }) {
  const rect = era.room?.panel_rect
  const stand = era.silhouettes?.stand
  const pic = era.room?.panel_image     // the period picture, when one has been chosen
  return (
    <div className="tb-room">
      <div className="tb-scene">
        <Figure src={era.room?.image} alt={era.room?.image_alt} className="tb-scene-bg" />
        {/* The picture on the wall, sitting exactly where the panel is in the art. */}
        {rect && (
          <button type="button" className="tb-panel" onClick={onOpenPaper}
                  style={{ left: `${rect.left}%`, top: `${rect.top}%`, width: `${rect.width}%`, height: `${rect.height}%` }}
                  aria-label={words.openPaper(era.label || era.year)}>
            {pic
              ? <img src={assetUrl(pic.src)} alt={pic.alt || ''} />
              : <span className="tb-panel-empty">{words.panelEmpty}</span>}
            <span className="tb-panel-go">{words.openIt}</span>
          </button>
        )}
        {/* The figures, standing in the room. */}
        {era.silhouettes?.image && stand && (
          <img className="tb-stand" src={assetUrl(era.silhouettes.image)} alt={era.silhouettes.image_alt || ''}
               style={{ left: `${stand.left}%`, bottom: `${stand.bottom}%`, height: `${stand.height}%` }} />
        )}
      </div>
      <div className="tb-room-under">
        {/* BK, 2026-10-27: "i need the information about the people to be in a callout,
            its hard to read the screen." One box, bigger type, real contrast. */}
        {(era.silhouettes?.caption || era.silhouettes?.attire_note) && (
          <aside className="tb-people">
            {era.silhouettes?.caption && <p className="tb-people-who">{era.silhouettes.caption}</p>}
            {era.silhouettes?.attire_note && <p className="tb-people-wear">{era.silhouettes.attire_note}</p>}
          </aside>
        )}
        {era.room?.caption && <p className="tb-note">{era.room.caption}</p>}
        {era.who_is_not_in_this_room && (
          <aside className="tb-absent">
            <span className="tb-absent-tag">{words.whoIsNotHere}</span>
            <p>{era.who_is_not_in_this_room}</p>
          </aside>
        )}
        {era.take_it_with_you && <p className="tb-take">{era.take_it_with_you}</p>}
      </div>
      {paperOpen && <Paper era={era} onClose={onClose} words={words} nowLabel={nowLabel} />}
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
              {e.label && String(e.label) !== String(e.year) && <span className="tb-year-label">{e.label}</span>}
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
        ? <Room era={era} words={words} paperOpen={paperOpen} nowLabel={data?.young_person_headings?.now_label}
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
  panelEmpty: 'The picture for this room has not been chosen yet.',
  openPaper: where => `Open the front page for ${where}`,
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
.tb-room{display:flex;flex-direction:column;gap:14px}
/* THE SCENE. The room is the background; everything else sits on it. */
.tb-scene{position:relative;container-type:inline-size;width:100%;max-width:1024px;border-radius:12px;overflow:hidden;border:1px solid var(--edge);line-height:0}
.tb-scene .tb-fig{margin:0}
.tb-scene .tb-fig img{display:block;width:100%;height:auto;border:0;border-radius:0}
.tb-scene .tb-fig figcaption{display:none}
.tb-scene .tb-fig-missing{border-radius:0;line-height:1.5}
/* The picture on the wall, placed on the panel. It is a picture, not a label - and it is
   never the raw chroma green the room was shot with. */
.tb-panel{position:absolute;padding:0;margin:0;border:0;cursor:pointer;overflow:hidden;
  background:linear-gradient(160deg,#6E5A3C,#4A3B26);display:flex;align-items:center;justify-content:center}
.tb-panel img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.tb-panel-empty{color:#E8DCC3;font-size:clamp(11px,1.15vw,14px);line-height:1.35;padding:6%;text-align:center;
  font-family:'Libre Baskerville',Georgia,serif}
.tb-panel-go{position:absolute;left:0;right:0;bottom:0;
  background:linear-gradient(to top,rgba(10,8,5,.92),rgba(10,8,5,.74));
  color:#F6EDD8;font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.14em;
  font-size:clamp(10px,1.15vw,13.5px);padding:5px 4px;text-align:center;
  border-top:1px solid rgba(246,237,216,.45)}
.tb-panel:hover .tb-panel-go,.tb-panel:focus-visible .tb-panel-go{background:#7A1F12;color:#FFF6E6}
.tb-panel:hover{outline:2px solid var(--gold);outline-offset:-2px}
/* The figures, standing in the room. */
.tb-stand{position:absolute;width:auto;display:block;pointer-events:none;
  /* The figures have to read against the wall - a dark parlor swallows a black
     silhouette. A thin light rim lifts them off it, and the shadow under them
     puts them on the floor instead of on the wallpaper. The rim scales with the
     scene so it stays a hairline on a phone and on the projector. */
  --rim:clamp(1px,0.2cqw,3px);
  filter:
    drop-shadow(0 0 calc(var(--rim) * 1.5) rgba(252,245,228,.8))
    drop-shadow(0 0 calc(var(--rim) * 4) rgba(252,245,228,.5))
    drop-shadow(0 0 calc(var(--rim) * 9) rgba(0,0,0,.45))
    drop-shadow(0 calc(var(--rim) * 2.5) calc(var(--rim) * 4) rgba(0,0,0,.6))}
.tb-room-under{display:flex;flex-direction:column;gap:14px;max-width:860px}
.tb-note{color:var(--grey);font-size:15px;line-height:1.55;margin:0}
.tb-take{color:var(--white);font-size:17px;line-height:1.55;margin:0;font-weight:600}
/* Who these people are. BK asked for a callout; it is the first thing read
   under the scene, so it gets size, contrast and room to breathe. */
.tb-people{border:1px solid var(--edge);border-left:4px solid var(--gold);border-radius:0 10px 10px 0;
  padding:14px 18px;background:color-mix(in srgb,var(--white) 7%,transparent)}
.tb-people-who{margin:0 0 7px;color:var(--white);font-size:clamp(16px,1.9vw,18px);line-height:1.45;
  font-weight:600}
.tb-people-wear{margin:0;color:var(--grey);font-size:clamp(14.5px,1.65vw,16px);line-height:1.6}
.tb-absent{border-left:3px solid var(--arena-signal);padding:10px 13px;border-radius:0 8px 8px 0;
  background:color-mix(in srgb,var(--arena-signal) 10%,transparent)}
.tb-absent-tag{display:block;font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.1em;
  font-size:12px;color:var(--arena-signal);margin-bottom:4px}
.tb-absent p{margin:0;color:var(--white);font-size:15px;line-height:1.5}
/* The paper, big in the foreground over the room. */
/* THE FRONT PAGE. It has to read as a newspaper at a glance - masthead rules,
   a story that dominates, column rules, dense serif - or a kid does not know
   what he is holding. Nothing here is locked: every story on the page opens. */
.tb-paper{position:fixed;inset:0;z-index:40;background:rgba(6,10,18,.86);display:flex;align-items:flex-start;
  justify-content:center;padding:22px 14px;overflow:auto}
.tb-paper-sheet{width:min(960px,100%);color:#120F0A;text-shadow:none;border-radius:2px;padding:26px clamp(18px,3.5vw,38px) 34px;
  font-family:'Libre Baskerville',Georgia,serif;
  background:#F0E6CE;
  background-image:
    radial-gradient(circle at 18% 12%,rgba(140,112,64,.07),transparent 42%),
    radial-gradient(circle at 82% 78%,rgba(140,112,64,.06),transparent 46%);
  box-shadow:0 24px 70px rgba(0,0,0,.65),inset 0 0 0 1px rgba(23,19,13,.18)}
/* Masthead: thin rule, name, thin rule, dateline, heavy rule. */
.tb-masthead{position:relative;border-top:1px solid #17130D;border-bottom:4px solid #17130D;
  padding:10px 0 0;margin:0 0 18px}
.tb-masthead h2{font-family:'Playfair Display',Georgia,serif;font-weight:900;text-shadow:none;
  font-size:clamp(30px,7.2vw,62px);line-height:1.02;letter-spacing:.01em;margin:0;text-align:center;
  color:#17130D;text-transform:uppercase}
.tb-edition{text-align:center;margin:8px 0 0;padding:5px 0;font-size:clamp(10px,1.5vw,12px);
  color:#3A3123;text-transform:uppercase;letter-spacing:.22em;font-family:'Barlow Condensed',sans-serif;
  border-top:1px solid #17130D;border-bottom:1px solid #17130D}
.tb-close{position:absolute;right:-6px;top:-10px;background:none;border:0;font-size:30px;line-height:1;
  cursor:pointer;color:#17130D;padding:4px 8px}
.tb-close:hover{color:#7A1F12}
/* Every story is a button, but it has to read as type on a page. */
.tb-item{text-align:left;background:none;border:0;padding:0;cursor:pointer;display:flex;flex-direction:column;min-width:0;overflow-wrap:break-word;
  gap:7px;color:#17130D;font-family:'Libre Baskerville',Georgia,serif}
.tb-item:hover .tb-item-head,.tb-item:focus-visible .tb-item-head{text-decoration:underline}
.tb-item-head{font-family:'Playfair Display',Georgia,serif;font-weight:800;text-shadow:none;font-size:19px;line-height:1.18;
  letter-spacing:-.01em}
.tb-item-lede{font-size:14.5px;line-height:1.62;color:#2C251A;text-align:justify;hyphens:auto}
.tb-item-go{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.14em;
  font-size:11.5px;color:#7A1F12}
/* The lead. One story runs the width of the page above the fold. */
.tb-lead{border-bottom:2px solid #17130D;padding-bottom:18px;margin-bottom:4px;gap:10px}
.tb-lead .tb-item-head{font-size:clamp(25px,4.6vw,40px);line-height:1.04;text-align:center;letter-spacing:-.015em}
.tb-lead .tb-item-lede{font-size:clamp(14.5px,1.7vw,16px);line-height:1.6;columns:2;column-gap:28px;
  column-rule:1px solid #C7B897}
.tb-lead .tb-item-go{align-self:center}
/* The columns under the fold, with rules between them. */
.tb-cols{display:grid;grid-template-columns:1fr;gap:0}
.tb-cols .tb-item{padding:16px 0;border-top:1px solid #C0B094}
.tb-cols .tb-item:first-child{border-top:0;padding-top:14px}
/* Bounded, or the two-column padding rules leak into the three-column layout
   and knock the right padding off every second story. */
@media (min-width:600px) and (max-width:879.98px){
  .tb-cols{grid-template-columns:1fr 1fr}
  .tb-cols .tb-item{padding:16px 20px}
  .tb-cols .tb-item:nth-child(2n+1){padding-left:0}
  .tb-cols .tb-item:nth-child(2n){padding-right:0;border-left:1px solid #C0B094}
  .tb-cols .tb-item:nth-child(-n+2){border-top:0;padding-top:14px}
}
@media (min-width:880px){
  .tb-cols{grid-template-columns:repeat(3,1fr)}
  .tb-cols .tb-item{padding:16px 20px;border-left:1px solid #C0B094}
  .tb-cols .tb-item:nth-child(3n+1){padding-left:0;border-left:0}
  .tb-cols .tb-item:nth-child(3n){padding-right:0}
  .tb-cols .tb-item:nth-child(-n+3){border-top:0;padding-top:14px}
}

/* The moment, standing under the masthead. */
.tb-moment{margin:0 0 18px;padding:0 0 16px;border-bottom:1px solid #C0B094;text-align:center;
  font-size:clamp(14px,1.8vw,16.5px);line-height:1.6;color:#2C251A;font-style:italic;
  max-width:62ch;margin-left:auto;margin-right:auto}
/* What changed since the last room. The headings are the data's own SEQ categories. */
.tb-changed{margin:22px 0 0;padding:18px 0 0;border-top:3px double #17130D;display:grid;gap:16px}
.tb-changed-row h4{margin:0 0 5px;font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;
  letter-spacing:.17em;font-size:12px;color:#7A1F12}
.tb-changed-row p{margin:0;font-size:14.5px;line-height:1.62;color:#2C251A;text-align:justify;hyphens:auto}
@media (min-width:760px){.tb-changed{grid-template-columns:repeat(3,1fr);gap:0}
  .tb-changed-row{padding:0 20px;border-left:1px solid #C0B094}
  .tb-changed-row:first-child{padding-left:0;border-left:0}
  .tb-changed-row:last-child{padding-right:0}}
/* The cut on the front page - a picture of what life looked like, run across the
   page under the dateline and above the lead. BK, 2026-10-27: "one image should
   appear on front page." */
.tb-cut{margin:0 0 20px;padding:0 0 18px;border-bottom:2px solid #17130D}
.tb-cut img{display:block;width:100%;height:auto;max-height:min(34vh,380px);object-fit:cover;object-position:center;
  border:1px solid #17130D;border-radius:0}
.tb-cut figcaption{margin:9px 0 0;font-size:13.5px;line-height:1.55;color:#2C251A;text-align:center}
.tb-cut .tb-credit,.tb-cut .tb-label{display:block;font-size:11.5px;color:#6B5B44;
  font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.13em;margin-top:4px}
.tb-cut .tb-fig-missing{border:1px dashed #B5A48A;background:rgba(23,19,13,.045);
  padding:22px;text-align:center;color:#5A4C39;font-size:13.5px;line-height:1.55}
.tb-cut .tb-fig-tag{display:block;font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;
  letter-spacing:.15em;font-size:11.5px;color:#7A1F12;margin-bottom:6px}

/* A story, read on the page. */
.tb-kicker{margin:0 0 6px;font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;
  letter-spacing:.19em;font-size:12px;color:#7A1F12}
.tb-byline{margin:0 0 12px;font-size:14px;color:#4A3F2C;font-style:italic}
.tb-lede{font-size:clamp(15.5px,1.9vw,17.5px);line-height:1.6;margin:0 0 14px;color:#1E1810;font-weight:600}
.tb-body{font-size:15px;line-height:1.68;margin:0 0 13px;color:#2C251A}
.tb-quote{margin:0 0 12px;padding:0 0 0 16px;border-left:3px solid #7A1F12}
.tb-quote p{margin:0 0 4px;font-size:15.5px;line-height:1.56;color:#1E1810}
.tb-quote cite{display:block;font-style:normal;font-size:12.5px;color:#5A4C39}
.tb-said{margin:0 0 16px}
/* The record, and the counter-voice. Both are the accountability half of a
   president's card; they get their own weight on the page. */
.tb-record,.tb-counter,.tb-leaves{margin:0 0 16px;padding:14px 16px;border:1px solid #C0B094}
.tb-record{background:rgba(122,31,18,.05);border:1px solid #C9A99A}
.tb-counter{background:rgba(23,19,13,.055);border:1px solid #B5A48A}
.tb-leaves{background:rgba(23,19,13,.045);border:1px solid #C0B094}
.tb-record p,.tb-counter p,.tb-leaves p{margin:0 0 6px;font-size:14.5px;line-height:1.62;color:#2C251A}
.tb-tag{display:block;margin:0 0 8px;font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;
  letter-spacing:.17em;font-size:11.5px;color:#7A1F12}
.tb-who{font-style:italic;color:#4A3F2C!important}
.tb-after{color:#4A3F2C!important}
.tb-src{display:block;font-size:12px;line-height:1.5;color:#6B5B44}
/* The census strip. */
.tb-census{margin:0 0 16px;display:grid;gap:0;border-top:1px solid #C0B094}
.tb-census-row{display:flex;justify-content:space-between;gap:16px;padding:9px 0;
  border-bottom:1px solid #D6CAB2}
.tb-census-row dt{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.11em;
  font-size:12.5px;color:#5A4C39}
.tb-census-row dd{margin:0;font-size:15px;font-weight:700;color:#17130D;text-align:right}
/* Being sixteen then, beside now. */
.tb-then{margin:0 0 16px;display:grid;gap:14px}
.tb-then-row{border-top:1px solid #C0B094;padding:13px 0 0}
.tb-then-row h4{margin:0 0 7px;font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;
  letter-spacing:.15em;font-size:12.5px;color:#7A1F12}
.tb-then-then{margin:0 0 9px;font-size:14.5px;line-height:1.64;color:#2C251A}
.tb-then-now{margin:0;font-size:14px;line-height:1.6;color:#4A3F2C;padding:9px 12px;
  background:rgba(23,19,13,.05);border-left:3px solid #7A1F12}
.tb-now-tag{display:inline-block;margin-right:9px;font-family:'Barlow Condensed',sans-serif;
  text-transform:uppercase;letter-spacing:.14em;font-size:11.5px;color:#7A1F12}
.tb-foot{margin:14px 0 0;font-size:13.5px;line-height:1.6;color:#4A3F2C;padding-top:12px;
  border-top:1px solid #C0B094}
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
