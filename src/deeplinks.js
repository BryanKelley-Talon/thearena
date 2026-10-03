// ============================================================
// DEEP LINKS — a link that opens a room, a Doc Assist casefile or the Office directly
// (Leo's order 2026-10-02, BK 15:23: "then i can paste direct links when i post casefiles").
//
// THE SCHEME (stable; old links keep working when content changes):
//   #/us · #/global                        a course door
//   #/us/units · #/us/threads · …          a lane on the door
//   #/us/11.1                              a unit room, by its framework number
//   #/us/11.1/review                       the unit's review
//   #/us/11.1/doc-assist                   the unit's Doc Assist
//   #/us/11.1/doc-assist/B                 one casefile (the page opens at Casefile B)
//   #/us/11.1/doc-assist/B/12              one document, by its printed number
//   #/us/0                                 Unit 0 (the six skills, for a new student or a parent)
//   #/office · #/office/2026-10-halftime-adjustments
//
// Numbers, not labels: a unit's title can change, its framework number can't. A link to
// anything missing or retired lands on the nearest thing that exists (the course door, or
// the front door), never on a blank page. A link carries nothing about a student.
// ============================================================

export const COURSE_KEY = { us11r: 'us', global10r: 'global' }
const KEY_COURSE = Object.fromEntries(Object.entries(COURSE_KEY).map(([k, v]) => [v, k]))
export const LANE_KEYS = { skills: 'skills', units: 'units', threads: 'threads', review: 'skills_review' }
const KEY_LANE = Object.fromEntries(Object.entries(LANE_KEYS).map(([k, v]) => [v, k]))

const unitByNumber = (course, n) => (course?.units || []).find(u => String(u.number) === String(n)) || null

// '#/us/11.1/doc-assist/B/12' → a route the App can apply. Unknown parts are dropped from the
// right until what's left exists, so a bad link still opens the nearest real place.
export function parseHash(hash, manifest) {
  const parts = String(hash || '').replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent)
  if (!parts.length || !manifest) return { at: 'splash' }
  if (parts[0] === 'office') return parts[1] ? { at: 'office', theme: parts[1] } : { at: 'office' }
  const courseId = KEY_COURSE[parts[0].toLowerCase()] || (manifest.courses || []).find(c => c.id === parts[0])?.id
  const course = (manifest.courses || []).find(c => c.id === courseId)
  if (!course) return { at: 'splash' }
  const r = { at: 'door', courseId }
  if (!parts[1]) return r
  if (KEY_LANE[parts[1]] !== undefined || LANE_KEYS[parts[1]]) return { ...r, lane: LANE_KEYS[parts[1]] || parts[1] }
  if (parts[1] === '0') return { ...r, at: 'unit0' }
  const unit = unitByNumber(course, parts[1])
  if (!unit) return r
  const u = { ...r, at: 'unit', unitSlug: unit.slug }
  if (parts[2] === 'review') return { ...u, at: 'review' }
  if (parts[2] === 'doc-assist') {
    const da = { ...u, at: 'docassist' }
    if (!parts[3]) return da
    const cf = parts[3].toUpperCase()
    if (parts[4] && /^\d+$/.test(parts[4])) return { ...da, cf, docN: Number(parts[4]) }
    return { ...da, cf }
  }
  return u
}

// The App's state → the link for where the student is now (written to the address bar
// quietly, so a teacher can copy it from there too).
export function buildHash(s) {
  if (s.office) return s.officeTheme ? `#/office/${s.officeTheme}` : '#/office'
  if (!s.course) return ''
  const c = `#/${COURSE_KEY[s.course.id] || s.course.id}`
  if (s.unit0) return `${c}/0`
  if (!s.unit) return s.lane ? `${c}/${KEY_LANE[s.lane] || s.lane}` : c
  const u = `${c}/${s.unit.number}`
  if (s.daOpen) {
    if (s.daDoc) return `${u}/doc-assist/${s.daDoc.cf}/${s.daDoc.n}`
    if (s.daCf) return `${u}/doc-assist/${s.daCf}`
    return `${u}/doc-assist`
  }
  if (s.review) return `${u}/review`
  return u
}

// Every link worth pasting, for BK's list: doors, Unit 0, each room, its review, its Doc
// Assist and each open casefile, and the Office.
export function linkList(manifest, base, daPacks = {}) {
  const out = []
  for (const c of manifest.courses || []) {
    const k = COURSE_KEY[c.id] || c.id
    out.push({ what: `${c.label}: the door`, href: `${base}#/${k}` })
    if (c.unit0?.published) out.push({ what: `${c.label}: Unit 0, the six skills`, href: `${base}#/${k}/0` })
    for (const u of c.units || []) {
      if (u.published !== true) continue
      const nm = String(u.label).startsWith(String(u.number)) ? u.label : `${u.number} · ${u.label}`
      out.push({ what: `${nm}: the room`, href: `${base}#/${k}/${u.number}` })
      if (u.brief_ref) out.push({ what: `${u.number}: the unit review`, href: `${base}#/${k}/${u.number}/review` })
      if (u.doc_assist?.published) {
        out.push({ what: `${u.number}: Doc Assist`, href: `${base}#/${k}/${u.number}/doc-assist` })
        for (const cf of (daPacks[u.doc_assist.content_ref]?.casefiles || []).filter(x => x.status === 'open' && (x.docs || []).length))
          out.push({ what: `${u.number}: Doc Assist, Casefile ${cf.id}`, href: `${base}#/${k}/${u.number}/doc-assist/${cf.id}` })
      }
    }
  }
  if (manifest.office?.published) out.push({ what: "BK's Office", href: `${base}#/office` })
  return out
}
