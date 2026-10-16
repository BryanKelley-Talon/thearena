// ============================================================
// THE REFERENCE ROOMS (US 11.2): THE MACHINE and THE AMENDMENTS (Leo's ruling 10/15 13:24; BK 13:21, 13:46,
// 13:48, 13:49; blessed 15:12, Room Check Bless). A study resource for the 11.2 test.
//   Layer 1: the chart as cards (the same words as the one-page chart kids hold).
//   Layer 2: a tap game (Final Say / Know Your Rights): a situation, a question, three choices; the why and the
//            card principle show after a pick.
// Every student word is Sam's (skills/machine/machine_words.py, skills/amendments/amendments_words.py), reshaped
// by scripts/packs/civics_pack.py, never retyped. The engine's own words are the Arena's existing practice labels
// (Question n of N, Correct, Not this one, reps this session). Nothing is scored, stored or sent.
// ============================================================
import { useMemo, useState } from 'react'

const shuffled = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }

function RefCard({ card, big }) {
  return (
    <article className="civ-card">
      <div className={`civ-head${big ? ' civ-num' : ''}`} aria-label={big ? `Amendment ${card.head}` : undefined}>{card.head}</div>
      {(card.kicker || []).length > 0 && <div className="civ-kicker">{card.kicker.join(' · ')}</div>}
      {(card.rows || []).map((r, i) => (
        <div key={i} className="civ-row">
          {r.label && <div className="civ-label">{r.label}</div>}
          {r.lines.length > 1
            ? <ul className="civ-lines">{r.lines.map((l, j) => <li key={j}>{l}</li>)}</ul>
            : r.lines.map((l, j) => <p key={j} className="civ-line">{l}</p>)}
        </div>
      ))}
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
      <div className="mc-q">{item.question}</div>
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

export function CivicsRoom({ pack, ScreenHeader, BottomBack, onBack, back }) {
  const [reps, setReps] = useState(0)
  const items = pack.layer2?.items || []
  return (
    <div className="civ">
      <ScreenHeader label={pack.title} onBack={onBack} back={back} color="#E3B341" />
      <div className="wrap civ-wrap">
        <h2 className="civ-title">{pack.title}</h2>
        <p className="civ-sub">{pack.sub}</p>
        {pack.how && <p className="civ-how">{pack.how}</p>}

        <h3 className="room-section">{pack.layer1.title}</h3>
        <p className="civ-intro">{pack.layer1.line}</p>
        {pack.layer1.groups.map((g, gi) => (
          <section key={gi} className="civ-group">
            {g.title && <h4 className="civ-group-h">{g.title}{g.years ? <span className="civ-years"> · {g.years}</span> : null}</h4>}
            <div className={`civ-grid${pack.number_cards ? ' civ-grid-num' : ''}`}>
              {g.cards.map((c, i) => <RefCard key={i} card={c} big={!!pack.number_cards} />)}
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
.civ-card{background:#1B2A47;border:1px solid #6882AD;border-radius:10px;padding:12px 14px;box-shadow:0 8px 20px -12px #000c}
.civ-head{font-family:'Barlow Condensed',sans-serif;font-size:24px;font-weight:700;letter-spacing:.04em;color:var(--white);text-transform:uppercase}
.civ-num{font-size:34px;line-height:1;color:var(--gold)}
.civ-kicker{color:var(--gold);font-size:13px;letter-spacing:.06em;text-transform:uppercase;margin:2px 0 6px}
.civ-row{border-top:1px solid #2E4370;padding:6px 0 2px}
.civ-label{font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:700;letter-spacing:.12em;color:var(--grey);text-transform:uppercase}
.civ-lines{margin:2px 0 4px;padding-left:18px;color:var(--white);font-size:15px;line-height:1.4}
.civ-line{margin:2px 0 4px;color:var(--white);font-size:15px;line-height:1.45}
.civ-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.civ-tag{border:1px solid #DCE3EE;border-radius:999px;padding:2px 10px;font-size:12.5px;color:#F4F6FA}
.civ-tag.vote{border:2px solid var(--gold);color:var(--gold);font-weight:700;letter-spacing:.08em}
.civ-foot{color:var(--grey);font-size:14px;margin:6px 0}
.civ-item{margin-bottom:14px}
.civ-sit{color:var(--white);font-size:16px;margin:4px 0 2px}
.civ-done{color:var(--gold);font-weight:600;margin:10px 0}
@media (max-width:520px){.civ-title{font-size:32px}.civ-grid,.civ-grid-num{grid-template-columns:1fr}}
`
