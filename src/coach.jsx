// ============================================================
// GROWTH COACHING — Leo's LOCKED bank (BK 2026-09-27 10:11), in BK's voice, under his
// portrait, on the parchment scroll. Every line lives in the manifest's `coaching`
// object, verbatim. This file only decides WHEN a line shows (the slots are Josh's).
//
// The bank's rules this file keeps:
//   • Welcome back only when this device holds real progress; otherwise a first-visit line.
//   • No numbers shaped like grades. Growth is reps.
//   • Nothing is remembered: counts of reps and finished sets live in page memory for
//     this visit only, and a reload starts them at zero.
//   • Lines about a season or a save code are Review Bowl's and never show here.
// ============================================================
import { useState } from 'react'

let BANK = {}
export function setCoachBank(b) { BANK = b || {} }

// This visit only. Never stored.
const visit = { reps: 0, sets: 0 }
export function noteSetDone(reps = 0) { visit.sets += 1; visit.reps += reps }
export const workedThisVisit = () => visit.sets > 0

const pick = arr => (Array.isArray(arr) && arr.length ? arr[Math.floor(Math.random() * arr.length)] : null)
const arena = arr => (arr || []).filter(l => !(BANK.bowl_only || []).includes(l))

export function welcomeLine(hasProgress, courseDoorLines = []) {
  return hasProgress ? pick(arena(BANK.welcome_back)) : pick([...arena(BANK.welcome_first), ...courseDoorLines])
}
export function skillLine(code, courseLines = []) {
  return pick([...(BANK.by_skill?.[code] || []), ...courseLines])
}
// A set just finished. The gauge moved: growth. Otherwise a set line, the big-session
// line past 20 reps this visit, and now and then a goal or a habit instead.
export function setDoneLine({ gaugeMoved }) {
  if (gaugeMoved) return pick(BANK.gauge_up)
  const r = Math.random()
  if (r < 0.25) return pick(BANK.goal_prompt)
  if (r < 0.45) return pick(BANK.habits)
  if (visit.reps >= 20) return pick(BANK.set_complete_big)
  return pick(BANK.set_complete)
}
export function signoffLine() {
  return Math.random() < 0.3 ? pick(BANK.habits) : pick(arena(BANK.signoff))
}

// The same parchment callout as GuideSays, for a line chosen once when it mounts.
export function CoachSays({ portrait, line }) {
  const [text] = useState(line)
  if (!text) return null
  return (
    <div className="guide-says coach" role="note">
      {portrait && <img className="guide-face" src={`/${portrait}`} alt="" />}
      <p>{text}</p>
    </div>
  )
}
