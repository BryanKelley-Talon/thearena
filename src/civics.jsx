// ============================================================
// THE REFERENCE ROOMS (US 11.2): THE MACHINE and THE AMENDMENTS (Leo's ruling 10/15 13:24; BK 13:21, 13:46,
// 13:48, 13:49; blessed 15:12, Room Check Bless). A study resource for the 11.2 test.
//   Layer 1: the chart as cards (the same words as the one-page chart kids hold).
//   Layer 2: a tap game (Final Say / Know Your Rights / Which Case?): a situation, sometimes a question of its
//            own, three choices; the why and the card principle show after a pick.
// THE LANDMARK CASES (2026-10-19) adds three things to the same renderer: a card badge (REGENTS FAVORITE), a row
// line that links to the clause's card in another room ({t, link: '<room>:<card>'}), and a card address, so
// #/us/11.2/amendments/14 opens that room with card 14 scrolled to and ringed.
// Every student word is Sam's (skills/machine/machine_words.py, skills/amendments/amendments_words.py), reshaped
// by scripts/packs/civics_pack.py, never retyped. The engine's own words are the Arena's existing practice labels
// (Question n of N, Correct, Not this one, reps this session). Nothing is scored, stored or sent.
// ============================================================
import { useEffect, useMemo, useRef, useState } from 'react'
import { COURSE_KEY } from './deeplinks.js'

const shuffled = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }

// A line is a string, or {t, link: '<room>:<card>'} pointing at the card in another room of the same unit
// where the kid already studied that clause. The link is built from the pack's own course and unit, so it
// follows the deep-link scheme and can't drift from it.
function Line({ l, base }) {
  if (!l || typeof l === 'string') return <>{l}</>
  const [room, card] = String(l.link || '').split(':')
  if (!base || !room || !card) return <>{l.t}</>
  return <a className="civ-link" href={`${base}/${room}/${encodeURIComponent(card)}`}>{l.t}</a>
}

function Rows({ r, wide, base }) {
  return (
    <div className={`civ-row${wide ? ' civ-row-wide' : ''}${r.label === 'LATER' ? ' civ-row-later' : ''}`}>
      {r.label && <div className="civ-label">{r.label}</div>}
      {r.lines.length > 1
        ? <ul className="civ-lines">{r.lines.map((l, j) => <li key={j}><Line l={l} base={base} /></li>)}</ul>
        : r.lines.map((l, j) => <p key={j} className="civ-line"><Line l={l} base={base} /></p>)}
    </div>
  )
}

function RefCard({ card, big, base, lit }) {
  const me = useRef(null)
  // An incoming card address scrolls to the card and rings it. The ring is a border, not a colour wash,
  // so it reads the same with colour off.
  useEffect(() => { if (lit && me.current) me.current.scrollIntoView({ block: 'center', behavior: 'smooth' }) }, [lit])
  return (
    <article ref={me} id={card.id ? `card-${card.id}` : undefined} tabIndex={lit ? -1 : undefined}
             className={`civ-card${(card.split || []).length ? ' civ-card-split' : ''}${card.image ? ' civ-card-img' : ''}${lit ? ' civ-card-lit' : ''}`}>
      {/* The branch's building, faded behind the card (BK 10/15 21:51). Decorative only: the words carry the meaning. */}
      {card.image && <img className="civ-bg" src={`/${String(card.image.src).replace(/^\/+/, '')}`} alt="" aria-hidden="true" loading="lazy" />}
      <div className={`civ-head${big ? ' civ-num' : ''}`} aria-label={big ? `Amendment ${card.head}` : undefined}>{card.head}</div>
      {card.who && <div className="civ-who">{card.who}</div>}
      {(card.kicker || []).length > 0 && <div className="civ-kicker">{card.kicker.join(' · ')}</div>}
      {card.badge && <div className="civ-badge">{card.badge}</div>}
      {/* Why one branch has two parts (BK 10/15 20:53): Sam's words, when they land. */}
      {card.callout && <aside className="civ-callout">{card.callout.head && <div className="civ-callout-h">{card.callout.head}</div>}{card.callout.lines.map((l, i) => <p key={i}>{l}</p>)}</aside>}
      {/* One branch, two parts: Congress's House and Senate side by side inside the one Congress card. */}
      {(card.split || []).length > 0 && <div className="civ-split">{card.split.map((h, k) => (
        <div key={k} className="civ-part">
          <div className="civ-part-h">{h.head}</div>
          {h.rows.map((r, i) => <Rows key={i} r={r} base={base} />)}
        </div>
      ))}</div>}
      {(card.rows || []).map((r, i) => <Rows key={`r${i}`} r={r} wide={(card.split || []).length > 0} base={base} />)}
      {(card.tags || []).length > 0 && <div className="civ-tags">{card.tags.map(t => <span key={t} className={`civ-tag${t === 'VOTE' ? ' vote' : ''}`}>{t}</span>)}</div>}
    </article>
  )
}

function TapItem({ item, n, total, onAnswer }) {
  const choices = useMemo(() => shuffled([{ t: item.answer, ok: true }, ...item.wrong.map(t => ({ t, ok: false }))]), [item])
  const [picked, setPicked] = useState(null)
  const answered = picked != null
  const right = answered && choices[picked].ok
  return (
    <div className="mc-item civ-item">
      <div className="mc-head"><span className="mc-count">Question {n} of {total}</span></div>
      <p className="civ-sit">{item.situation}</p>
      {item.question && <div className="mc-q">{item.question}</div>}
      <div className="mc-choices">
        {choices.map((c, i) => {
          let cls = 'mc-choice'
          if (answered) cls += c.ok ? ' correct' : i === picked ? ' incorrect' : ' dim'
          return (
            <button key={i} type="button" className={cls} disabled={answered} onClick={() => { if (picked == null) { setPicked(i); onAnswer(c.ok) } }}>
              <b>{'ABC'[i]}.</b> <span>{c.t}</span>
              {/* The verdict is a WORD, not just a colour. */}
              {answered && c.ok && <em className="mc-mark">Correct</em>}
              {answered && i === picked && !right && <em className="mc-mark">Not this one</em>}
            </button>
          )
        })}
      </div>
      {answered && <div className="mc-reveal">
        <p className="mc-reasoning">{item.why}</p>
        <div className="civ-tags"><span className="civ-tag">{item.principle}</span></div>
      </div>}
    </div>
  )
}

export function CivicsRoom({ pack, ScreenHeader, BottomBack, onBack, back, cardTarget }) {
  const [reps, setReps] = useState(0)
  const items = pack.layer2?.items || []
  // '#/us/11.2' - the address of this room's unit, which every card link hangs off.
  const base = pack.course && pack.unit ? `#/${COURSE_KEY[pack.course] || pack.course}/${pack.unit}` : null
  return (
    <div className="civ">
      <ScreenHeader label={pack.title} onBack={onBack} back={back} color="#E3B341" />
      <div className="wrap civ-wrap">
        <h2 className="civ-title">{pack.title}</h2>
        <p className="civ-sub">{pack.sub}</p>
        {pack.how && <p className="civ-how">{pack.how}</p>}

        <h3 className="room-section">{pack.layer1.title}</h3>
        {pack.layer1.line && <p className="civ-intro">{pack.layer1.line}</p>}
        {pack.layer1.groups.map((g, gi) => (
          <section key={gi} className="civ-group">
            {g.title && <h4 className="civ-group-h">{g.title}{g.years ? <span className="civ-years"> · {g.years}</span> : null}</h4>}
            <div className={`civ-grid${pack.number_cards ? ' civ-grid-num' : ''}${pack.wide_cards ? ' civ-grid-wide' : ''}${g.cards.some(c => (c.split || []).length) ? ' civ-grid-branches' : ''}`}>
              {g.cards.map((c, i) => <RefCard key={i} card={c} big={!!pack.number_cards} base={base}
                                              lit={!!cardTarget && String(c.id ?? c.head) === String(cardTarget)} />)}
            </div>
          </section>
        ))}
        {(pack.layer1.foot || []).map((f, i) => <p key={i} className="civ-foot">{f}</p>)}

        <h3 className="room-section">{pack.layer2.title}</h3>
        <p className="civ-intro">{pack.layer2.line}</p>
        {items.map((it, i) => <TapItem key={i} item={it} n={i + 1} total={items.length} onAnswer={() => setReps(r => r + 1)} />)}
        {reps >= items.length && pack.layer2.done && <p className="civ-done" role="status">{pack.layer2.done}</p>}
        {reps > 0 && <div className="counters" role="status" aria-live="polite"><span className="counter"><b>{reps}</b> {reps === 1 ? 'rep' : 'reps'} this session</span></div>}
      </div>
      <BottomBack onBack={onBack} back={back} />
    </div>
  )
}

export const CIVICS_STYLES = `
.civ-wrap{max-width:980px}
.civ .room-section{margin-top:26px}
.civ-title{font-family:'Barlow Condensed',sans-serif;font-size:40px;letter-spacing:.04em;margin:8px 0 4px;color:var(--white)}
.civ-sub{font-size:18px;color:var(--white);margin:0 0 6px;max-width:760px}
.civ-how{color:var(--grey);margin:0 0 10px;max-width:760px}
.civ-intro{color:var(--grey);margin:-4px 0 14px}
.civ-group{margin:0 0 18px}
.civ-group-h{font-family:'Barlow Condensed',sans-serif;font-size:20px;letter-spacing:.08em;text-transform:uppercase;color:var(--gold);margin:14px 0 8px}
.civ-years{color:var(--grey);font-weight:500}
.civ-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
.civ-grid-num{grid-template-columns:repeat(auto-fill,minmax(200px,1fr))}
/* Cards that carry prose rows (THE LANDMARK CASES) need a readable measure, not a ribbon. */
.civ-grid-wide{grid-template-columns:repeat(auto-fill,minmax(300px,1fr))}
.civ-card-img{position:relative;overflow:hidden}
.civ-card-img>*:not(.civ-bg){position:relative}
/* The building sits behind the branch name (top band), baked as a navy duotone (card navy to #344E6E), so the brightest pixel behind any word is known:
   white 8.4:1, gold 4.7:1, labels (lifted to #B4C2D4 on these cards) 5.0:1. No CSS opacity, so the numbers hold. */
.civ-bg{position:absolute;left:0;right:0;top:0;width:100%;height:210px;object-fit:cover;object-position:center 35%;pointer-events:none;-webkit-mask-image:linear-gradient(to bottom,#000 55%,transparent);mask-image:linear-gradient(to bottom,#000 55%,transparent)}
.civ-card-img .civ-label{color:#B4C2D4}
.civ-card-img .civ-part{background:rgba(22,35,61,.55)}
.civ-card{background:#1B2A47;border:1px solid #6882AD;border-radius:10px;padding:12px 14px;box-shadow:0 8px 20px -12px #000c}
.civ-head{font-family:'Barlow Condensed',sans-serif;font-size:24px;font-weight:700;letter-spacing:.04em;color:var(--white);text-transform:uppercase}
.civ-num{font-size:34px;line-height:1;color:var(--gold)}
.civ-who{color:var(--white);font-size:16px;font-weight:600;margin:2px 0 0}
.civ-kicker{color:var(--gold);font-size:13px;letter-spacing:.06em;text-transform:uppercase;margin:2px 0 6px}
.civ-row{border-top:1px solid #2E4370;padding:6px 0 2px}
.civ-label{font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:700;letter-spacing:.12em;color:var(--grey);text-transform:uppercase}
.civ-lines{margin:2px 0 4px;padding-left:18px;color:var(--white);font-size:15px;line-height:1.4}
.civ-line{margin:2px 0 4px;color:var(--white);font-size:15px;line-height:1.45}
.civ-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
/* REGENTS FAVORITE: the gold pill the VOTE tag already uses, so the two reference rooms read the same. */
.civ-badge{display:inline-block;border:2px solid var(--gold);border-radius:999px;padding:1px 10px;font-family:'Barlow Condensed',sans-serif;font-size:12.5px;font-weight:700;letter-spacing:.08em;color:var(--gold);margin:2px 0 4px}
/* A clause that points at its card in THE MACHINE or THE AMENDMENTS. Underlined, so it is not colour alone. */
.civ-link{color:var(--gold);text-decoration:underline;text-underline-offset:2px}
.civ-link:hover,.civ-link:focus-visible{color:#F2D37A}
.civ-row-later .civ-label{color:var(--gold)}
/* The card an address landed on: a ring, not a wash. */
.civ-card-lit{outline:3px solid var(--gold);outline-offset:2px}
.civ-tag{border:1px solid #DCE3EE;border-radius:999px;padding:2px 10px;font-size:12.5px;color:#F4F6FA}
.civ-tag.vote{border:2px solid var(--gold);color:var(--gold);font-weight:700;letter-spacing:.08em}
.civ-grid-branches{grid-template-columns:2fr 1fr 1fr;align-items:start}
.civ-split{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:4px}
.civ-part{border:1px solid #2E4370;border-radius:8px;padding:6px 10px 4px;background:#16233D}
.civ-part-h{font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--white);margin:2px 0 2px}
.civ-row-wide{margin-top:6px}
.civ-callout{border:2px dashed #DCE3EE;border-radius:8px;padding:8px 12px;margin:6px 0 8px;color:var(--white)}
.civ-callout-h{font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--gold);font-size:14px}
.civ-callout p{margin:3px 0;font-size:15px}
@media (max-width:1000px){.civ-grid-branches{grid-template-columns:1fr}}
@media (max-width:520px){.civ-split{grid-template-columns:1fr}}
.civ-foot{color:var(--grey);font-size:14px;margin:6px 0}
.civ-item{margin-bottom:14px}
.civ-sit{color:var(--white);font-size:16px;margin:4px 0 2px}
.civ-done{color:var(--gold);font-weight:600;margin:10px 0}
@media (max-width:520px){.civ-title{font-size:32px}.civ-grid,.civ-grid-num{grid-template-columns:1fr}}
`
