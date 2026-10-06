// ============================================================
// YOUR MOMENTS IN EVERY UNIT — Leo's ruling 2026-10-05 23:31, item 2. Words APPROVED by BK 23:31.
// On each Arena door (the home lane, Your Skills) and in Unit 0, both courses. The two versions
// differ only in step 1's map: Threads map (US) · Enduring Issues map (Global).
//
// The rules this file keeps:
//   • The card's words are BK's, used exactly. No "thread" on the Global card.
//   • Each tool name links to its live destination (the Arena's own hash links, deeplinks.js).
//     A tool that isn't live yet shows how it shows: not a link, with "Coming" or its open day.
//   • Make the Case is done on their own. Its one link (BK 10/6) is to the map's model paragraphs.
//   • Nothing is stored and nothing is sent.
// ============================================================
import { COURSE_KEY } from './deeplinks.js'

// BK 23:31, word for word (step 1's map is the course's own).
export const MOMENTS_WORDS = {
  title: 'Your moments in every unit',
  steps: [
    { n: 1, name: 'Get your bearings.', q: 'Where are we, and what led here?' },
    { n: 2, name: 'Work the documents.', q: 'What is this, and what does it say?' },
    { n: 3, name: 'Build your case.', q: 'How do the pieces fit together?' },
    // BK 2026-10-06 09:20 ("yes as it is."): why Make the Case matters, and where to see it done.
    // BK 09:25 ("yes. approved. signed. push it."): where it is, at the end of the casefile.
    { n: 4, name: 'Make the Case.', q: 'On your own, at the end of your casefile. Everything above gets you here.',
      more: 'Your document work is building toward this paragraph, and your skill grades come from it. Strong paragraphs here are what unlock the essay.' },
    { n: 5, name: 'Read your gauges.', q: 'What do I work on next?' },
  ],
  backInto: 'Back into the Arena:',
  seeHow: 'See how it\u2019s done: every stop on the',
  modelPara: 'has a model paragraph.',
  // Container words for a tool that isn't open yet — to BK in the morning proof.
  coming: 'Coming',
  opens: d => `opens ${d}`,
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec']
const dayOf = iso => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${MONTHS[+m[2] - 1]} ${+m[3]}` : null }
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

// Every tool on the card, with where it goes today (or why it doesn't go anywhere yet).
function toolsFor(course, unit, maps, preview) {
  const k = `#/${COURSE_KEY[course.id] || course.id}`
  const n = unit ? String(unit.number) : null
  const live = arr => (arr || []).some(x => x.published === true)
  const T = {}
  T.threads = live(course.threads) ? { name: 'Threads map', href: `${k}/threads` } : { name: 'Threads map' }
  T.issues = live(course.issues) ? { name: 'Enduring Issues map', href: `${k}/issues` } : { name: 'Enduring Issues map' }
  T.atlas = live(course.atlas) ? { name: 'Atlas', href: `${k}/atlas` } : { name: 'Atlas' }
  const unitMaps = n && (maps || []).some(m => String(m.unit) === n)
  T.unitAtlas = unitMaps ? { name: 'Atlas', href: `${k}/${n}/atlas` } : T.atlas
  T.docAssist = unit?.doc_assist?.published ? { name: 'Doc Assist', href: `${k}/${n}/doc-assist` } : { name: 'Doc Assist', note: MOMENTS_WORDS.coming }
  // Blueprint: the current unit's set if it's open; its open day if it isn't yet.
  const sets = (course.writing_lab || []).filter(e => e.published === true && (e.tool || 'blueprint') === 'blueprint')
  const set = sets.find(e => String(e.unit) === n) || sets[0]
  if (!set) T.blueprint = { name: 'Blueprint', note: MOMENTS_WORDS.coming }
  else if (!preview && set.opens_on && set.opens_on > today()) T.blueprint = { name: 'Blueprint', note: MOMENTS_WORDS.opens(dayOf(set.opens_on)) }
  else T.blueprint = { name: 'Blueprint', href: `${k}/writing-lab/${set.slug}` }
  T.climbs = { name: 'skill climbs', href: `${k}/skills` }
  T.review = unit?.brief_ref ? { name: 'Unit review', href: `${k}/${n}/review` } : { name: 'Unit review', note: MOMENTS_WORDS.coming }
  const bowl = (course.skills_review || []).find(x => /review bowl/i.test(x.label || '') && x.published === true && x.status === 'open')
  T.bowl = bowl ? { name: 'Review Bowl', href: bowl.url, out: true } : { name: 'Review Bowl', note: MOMENTS_WORDS.coming }
  // The unit game lives in its unit's room.
  T.game = n ? { name: 'the unit game', href: `${k}/${n}` } : { name: 'the unit game' }
  // Case Closed is built and waiting on its domain (LIVE.md): Coming until it has one.
  const cc = course.case_closed && course.case_closed.published === true && course.case_closed.url
  T.caseClosed = cc ? { name: 'Case Closed', href: course.case_closed.url, out: true } : { name: 'Case Closed', note: MOMENTS_WORDS.coming }
  return T
}

function Tool({ t }) {
  if (t.href) return <a className="mo-tool" href={t.href} {...(t.out ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{t.name}</a>
  return <span className="mo-tool off">{t.name}{t.note ? <span className="mo-note"> ({t.note})</span> : null}</span>
}
const Dot = () => <span className="mo-dot" aria-hidden="true"> &middot; </span>

export function MomentsCard({ course, unit, maps, preview, compact }) {
  const T = toolsFor(course, unit, maps, preview)
  const global = course.id === 'global10r'
  const W = MOMENTS_WORDS
  const tools = {
    1: [global ? T.issues : T.threads, T.atlas],
    2: [T.docAssist, T.unitAtlas],
    3: [T.blueprint],
    4: [global ? T.issues : T.threads],
    5: [T.climbs, T.review, T.bowl, T.game, T.caseClosed],
  }
  return (
    <section className={`moments${compact ? ' compact' : ''}`} aria-labelledby={`mo-h-${course.id}`}>
      <h3 className="mo-title" id={`mo-h-${course.id}`}>{W.title}</h3>
      <ol className="mo-steps">
        {W.steps.map(s => (
          <li key={s.n} className={`mo-step${s.n === 4 ? ' own' : ''}`}>
            <span className="mo-n" aria-hidden="true">{s.n}</span>
            <div className="mo-body">
              <div className="mo-name">{s.name}</div>
              <div className="mo-q">{s.q}</div>
              {s.more && <div className="mo-more">{s.more}</div>}
              {tools[s.n] && (
                <div className="mo-tools">
                  <span className="mo-arrow" aria-hidden="true">&rarr; </span>
                  {s.n === 3 && <><Tool t={tools[3][0]} />, in the Writing Lab</>}
                  {s.n === 5 && <>{W.backInto} {tools[5].map((t, i) => <span key={i}>{i > 0 && <Dot />}<Tool t={t} /></span>)}</>}
                  {s.n === 4 && <>{W.seeHow} <Tool t={tools[4][0]} /> {W.modelPara}</>}
                  {s.n !== 3 && s.n !== 4 && s.n !== 5 && tools[s.n].map((t, i) => <span key={i}>{i > 0 && <Dot />}<Tool t={t} /></span>)}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

export const MOMENTS_STYLES = `
/* ---------- YOUR MOMENTS IN EVERY UNIT (Leo's ruling 10/5 23:31) ---------- */
.moments{background:var(--card);border:1px solid var(--edge);border-top:4px solid var(--gold);border-radius:12px;padding:14px 18px 16px;
  margin:4px 0 26px;box-shadow:var(--arena-lift);max-width:1100px}
.mo-title{margin:0 0 10px;font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.14em;color:var(--gold);font-size:17px}
.mo-steps{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}
.mo-step{display:flex;gap:9px;align-items:flex-start;background:color-mix(in srgb,var(--canvas) 45%,var(--card));border:1px solid var(--edge);
  border-radius:10px;padding:10px 10px 11px}
.mo-step.own{border-color:var(--gold);background:color-mix(in srgb,var(--gold) 9%,var(--card))}
.mo-n{flex:none;width:26px;height:26px;border-radius:50%;background:var(--gold);color:#0B1220;font:700 15px/26px 'Barlow Condensed',sans-serif;text-align:center}
.mo-body{min-width:0}
.mo-name{color:var(--white);font-weight:700;font-size:15.5px;line-height:1.25}
.mo-q{color:var(--grey);font-size:14px;line-height:1.4;margin-top:2px}
.mo-step.own .mo-q{color:var(--white)}
.mo-more{color:var(--white);font-size:14px;line-height:1.45;margin-top:6px}
.mo-tools{margin-top:6px;color:var(--white);font-size:14px;line-height:1.55;overflow-wrap:anywhere}
.mo-arrow{color:var(--gold)}
.mo-tool{color:var(--gold-lit);font-weight:600;text-decoration:underline;text-underline-offset:3px}
.mo-tool:hover{color:var(--white)}
.mo-tool.off{color:var(--grey);font-weight:600;text-decoration:none}
.mo-note{font-weight:400}
.mo-dot{color:var(--dim)}
@media (max-width:1100px){ .mo-steps{grid-template-columns:repeat(2,minmax(0,1fr))} .mo-step.own{grid-column:span 2} }
@media (max-width:620px){ .mo-steps{grid-template-columns:1fr} .mo-step.own{grid-column:auto} .moments{padding:12px 12px 14px} }
`
