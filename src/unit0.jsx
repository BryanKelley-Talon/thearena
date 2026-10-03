// ============================================================
// UNIT 0 — "The Six Skills, Outside a History Class" (Leo's order 2026-10-03 15:17; Sam's
// content, co-signed by Will, BK ruled 15:24 / 15:31 / 15:45; Be a Hawk bank LOCKED 15:47).
//
// One room in each door, oldest of the Units, with its own link (#/us/0, #/global/0) that BK
// can hand a new student or a parent. Every skill's words are Sam's file, ported word for
// word; each room shows only its own entries (`rooms`) and its own next-step text
// (`text_<course>`). Below the skills, the Be a Hawk set: BK and Leo's 24 locked questions in
// the Office's question shape. Nothing is scored, nothing is kept.
// ============================================================
import { useState } from 'react'

// The room's own labels: approved by BK 2026-10-03 18:48 ("Yes"), word for word.
export const U0 = {
  number: '0',
  tag: 'Start here',
  scene: 'The scene',
  skip: 'Skip it',
  doIt: 'Do it',
  skill: 'The skill',
  gauge: 'The gauge',
  next: 'Your next step',
  help: 'Where to get help',
}

export const unit0Name = pack => `${U0.number} · ${pack?.title || 'The Six Skills'}`
const forRoom = (pack, courseId) => (pack?.scenarios || []).filter(s => !s.rooms || s.rooms.includes(courseId))

// The card in the Units lane: last of the list, the oldest unit.
export function Unit0Card({ course, onOpen }) {
  if (!course?.unit0?.published) return null
  return (
    <button type="button" className="card u0-card" onClick={onOpen}>
      <span className="u0-tag">{U0.tag}</span>
      <div className="card-name">{`${U0.number} · ${course.unit0.label}`}</div>
      <span className="flag live">Open</span>
    </button>
  )
}

export function Unit0Room({ course, pack, culture, ui, onBack }) {
  const { ScreenHeader, BottomBack, McItem } = ui
  const [open, setOpen] = useState(null)              // a skill's code, or null for the room
  const items = forRoom(pack, course.id)
  const s = open && open !== 'hawk' ? items.find(x => x.skill === open) : null
  const name = unit0Name(pack)
  const goRoom = () => { setOpen(null); window.scrollTo(0, 0) }

  // The Be a Hawk set, on its own page: 24 questions are a long scroll under the skills.
  if (open === 'hawk' && culture) return (
    <div className="wrap">
      <ScreenHeader label={culture.theme?.title} onBack={goRoom} color={course.accent} back={name} />
      <section className="u0-hawk" style={{ maxWidth: 860 }}>
        {culture.practice?.intro && <p className="lane-intro">{culture.practice.intro}</p>}
        {(culture.practice?.items || []).map((it, i, all) => (
          <McItem key={it.n ?? i} item={it} n={i + 1} total={all.length} onAnswer={() => {}} />
        ))}
      </section>
      <BottomBack onBack={goRoom} back={name} />
    </div>
  )

  if (s) return (
    <div className="wrap">
      <ScreenHeader label={s.name} onBack={goRoom} color={course.accent} back={name} />
      <div className="detail u0-skill" style={{ maxWidth: 820 }}>
        <p className="u0-card-line">{s.card_line}</p>
        <h3 className="room-section">{U0.scene}</h3>
        <p className="u0-scene">{s.scene}</p>
        <div className="u0-pair">
          <div className="u0-box u0-skip"><div className="u0-box-h">{U0.skip}</div><p>{s.skip_it}</p></div>
          <div className="u0-box u0-do"><div className="u0-box-h">{U0.doIt}</div><p>{s.do_it}</p></div>
        </div>
        <h3 className="room-section">{U0.skill}</h3>
        <p>{s.the_skill}</p>
        <h3 className="room-section">{U0.gauge}</h3>
        <ol className="u0-bands">
          {(s.gauge || []).map(b => <li key={b.band}><span className="u0-band">{b.band}</span><span>{b.text}</span></li>)}
        </ol>
        <h3 className="room-section">{U0.next}</h3>
        <ul className="u0-steps">
          {(s.next_step || []).map(n => (
            <li key={n.step}><span className="u0-step">{n.step}</span><span>{n[`text_${course.id}`] || n.text}</span></li>
          ))}
        </ul>
        <h3 className="room-section">{U0.help}</h3>
        <ul className="u0-help">{(s.help || []).map((h, i) => <li key={i}>{h}</li>)}</ul>
      </div>
      <BottomBack onBack={goRoom} back={name} />
    </div>
  )

  return (
    <div className="wrap">
      <ScreenHeader label={name} onBack={onBack} color={course.accent} back={course.label} />
      {pack === null && <div className="loading">Opening Unit 0&hellip;</div>}
      {pack && <>
        <p className="lane-intro">{pack.intro}</p>
        <div className="grid room-cards u0-skills" style={{ marginBottom: 34 }}>
          {items.map(x => (
            <button key={x.skill} type="button" className="card" onClick={() => { setOpen(x.skill); window.scrollTo(0, 0) }}>
              <div className="card-name">{x.name}</div>
              <div className="card-blurb">{x.card_line}</div>
              <span className="flag live">Open</span>
            </button>
          ))}
        </div>
      </>}
      {culture && (
        <>
          <h3 className="room-section">{culture.theme?.title}</h3>
          <div className="grid room-cards" style={{ marginBottom: 34 }}>
            <button type="button" className="card" onClick={() => { setOpen('hawk'); window.scrollTo(0, 0) }}>
              <div className="card-name">{culture.theme?.title}</div>
              <div className="card-blurb">{culture.practice?.intro}</div>
              <span className="flag live">Open</span>
            </button>
          </div>
        </>
      )}
      <BottomBack onBack={onBack} back={course.label} />
    </div>
  )
}

export const UNIT0_STYLES = `
/* ---------- UNIT 0 ---------- */
.u0-card{position:relative}
.u0-tag{align-self:flex-start;display:inline-block;margin-bottom:6px;font:700 12px/1 'Barlow Condensed',sans-serif;letter-spacing:.12em;
  text-transform:uppercase;color:#0B1220;background:var(--gold);border-radius:4px;padding:4px 7px}
.u0-skill{background:rgba(11,18,32,.9);border:1px solid #2A3A5C;border-radius:12px;padding:18px 20px 6px;box-shadow:0 8px 24px rgba(0,0,0,.35)}
@media (max-width:640px){.u0-skill{padding:14px 14px 4px}}
.u0-skill p{font-size:17px;line-height:1.55;margin:0 0 20px}
.u0-skill .room-section{margin-top:6px}
.u0-hawk .lane-intro{margin-bottom:14px}
.u0-card-line{font-size:19px!important;line-height:1.45;color:var(--white);border-left:3px solid var(--gold);padding-left:12px;margin:4px 0 22px!important}
.u0-scene{font-size:18px;line-height:1.55}
.u0-pair{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:14px 0 22px}
@media (max-width:640px){.u0-pair{grid-template-columns:1fr}}
.u0-box{background:#1B2A47;border:2px solid #6882AD;border-radius:10px;padding:12px 14px}
.u0-box p{margin:6px 0 0;font-size:16.5px;line-height:1.5}
.u0-box-h{font:800 15px/1 'Barlow Condensed',sans-serif;letter-spacing:.1em;text-transform:uppercase}
.u0-skip{border-style:dashed}
.u0-skip .u0-box-h{color:#C9D3E3}
.u0-do{border-color:var(--gold)}
.u0-do .u0-box-h{color:var(--gold)}
.u0-bands,.u0-steps,.u0-help{list-style:none;padding:0;margin:0 0 20px;display:flex;flex-direction:column;gap:8px}
.u0-bands li,.u0-steps li{display:flex;gap:12px;align-items:baseline;background:#131C2E;border:1px solid #2A3A5C;border-radius:8px;padding:9px 12px;font-size:16.5px;line-height:1.45}
.u0-band{flex:none;min-width:30px;text-align:center;font:800 20px/1 'Barlow Condensed',sans-serif;color:#0B1220;background:#C9D3E3;border-radius:5px;padding:3px 0}
.u0-bands li:first-child .u0-band{background:var(--gold)}
.u0-step{flex:none;font:800 17px/1 'Barlow Condensed',sans-serif;letter-spacing:.04em;color:var(--gold);min-width:52px}
.u0-help li{padding-left:18px;position:relative;font-size:16.5px;line-height:1.45}
.u0-help li::before{content:'';position:absolute;left:4px;top:10px;width:6px;height:6px;border-radius:50%;background:var(--gold)}
.u0-hawk{margin-top:10px}
`
