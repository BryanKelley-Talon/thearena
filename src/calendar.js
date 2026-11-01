// ============================================================
// THE UNIT CALENDAR — open dates reference a named anchor, never a typed date.
//   Will 2026-10-31 09:12 / 09:18 (BK 09:04, 09:06, 09:16): "weather related snow days are a
//   thing coming up this winter...every day gets pushed back one on the established calendar."
//   Sam 2026-10-31 18:35 / 19:03 / 19:05: "each row references a named anchor, not a typed date.
//   I own and compute every anchor. A snow day is one edit to my anchor list."
//
// Shape (manifest, per unit):
//   unit.calendar        { DAY_0: { date: "2026-11-04", text: "Wed 11/4" }, ... }   the desk's anchors, verbatim
//                        (a bare "2026-11-04" works too; its text is then the weekday and m/d)
//   <entry>.opens_label  may carry "{day}": it reads the anchor's text ("Coming on {day}" -> "Coming on Mon 11/23"),
//                        so a cold document's placeholder moves with a snow day too (BK 10/31 18:09's wording)
//   <any entry>.opens_at "A_BACK"           -> opens_on is that anchor's date
//   <level>.model_opens_at "HC_L5_MODEL"    -> model_opens_on is that anchor's date
//   unit.status_open_at  "DAY_0"            -> status 'building' until that day, then 'open'
//   course.current_unit_schedule [{ at: "DAY_0", unit: "unit-3" }]   the door switches on that day
//     (`at` names an anchor in the named unit's calendar; `on` may give a date instead.)
//
// Josh never computes a date. A snow day: the desk sends a new anchor list, the `calendar` block
// is replaced whole, every entry in that unit re-reads. Nothing else in the manifest changes.
// The same function runs at build (scripts/resolve-calendar.mjs, before hold-unopened) and in the
// page (App's manifest load), so a preview build and the served page read the same dates.
// ============================================================

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const anchorOf = (cal, name) => {
  const a = cal?.[name]
  const date = typeof a === 'string' ? a : a?.date
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const [y, mo, d] = date.split('-').map(Number)
  const text = (typeof a === 'object' && a.text) || `${DOW[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()]} ${mo}/${d}`
  return { date, text }
}
const ANCHOR_KEYS = [['opens_at', 'opens_on'], ['model_opens_at', 'model_opens_on'], ['card_opens_at', 'card_opens_on']]

export function resolveCalendar(manifest, today) {
  const problems = []
  for (const course of manifest?.courses || []) {
    for (const unit of course.units || []) {
      const cal = unit.calendar
      if (!cal) continue
      const walk = (o, where) => {
        if (Array.isArray(o)) o.forEach((v, i) => walk(v, `${where}[${i}]`))
        else if (o && typeof o === 'object') {
          for (const [from, to] of ANCHOR_KEYS) {
            if (typeof o[from] === 'string') {
              const a = anchorOf(cal, o[from])
              if (a) { o[to] = a.date; if (from === 'opens_at' && typeof o.opens_label === 'string') o.opens_label = o.opens_label.replace('{day}', a.text) }
              else problems.push(`${course.id} ${unit.number} ${where}: ${from} '${o[from]}' is not an anchor in this unit's calendar`)
            }
          }
          for (const [k, v] of Object.entries(o)) if (k !== 'calendar' && v && typeof v === 'object') walk(v, `${where}.${k}`)
        }
      }
      walk(unit, unit.number)
      if (typeof unit.status_open_at === 'string') {
        const d = anchorOf(cal, unit.status_open_at)?.date
        if (!d) problems.push(`${course.id} ${unit.number}: status_open_at '${unit.status_open_at}' is not an anchor`)
        else unit.status = today >= d ? 'open' : 'building'
      }
    }
    const sched = course.current_unit_schedule
    if (Array.isArray(sched)) {
      let pick = null
      for (const s of sched) {
        const u = (course.units || []).find(x => x.slug === s.unit)
        const d = s.on || (s.at && anchorOf(u?.calendar, s.at)?.date)
        if (!u || !d) { problems.push(`${course.id}: current_unit_schedule entry ${JSON.stringify(s)} does not resolve`); continue }
        if (today >= d && (!pick || d >= pick.d)) pick = { d, unit: s.unit }
      }
      if (pick) course.current_unit = pick.unit
    }
  }
  return problems
}

export const todayInCorning = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date())
