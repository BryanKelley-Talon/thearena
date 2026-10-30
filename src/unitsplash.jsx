// ============================================================
// THE UNIT SPLASH — from 11.3A and 10.3 on, a unit opens on its doors (BK 2026-10-30).
//   13:07 "Kid should be able to reach Part 1 practice for that Unit's Test Review area.
//          Blueprint can live in C. yes by tuesday. door 4 yes...no door 5 yet."
//   13:14 "the main splash of a unit has the doors, the atlas, and the Unit Test Review
//          card...and it's live for day 1 of a unit. (doc assist lives inside of the rooms)."
//   13:24 "yes to all": older units keep the rooms they were built with; B and C show on
//          Day 1 with their open day; Door 4 is the same in every unit, open from Day 1.
//
// A unit takes the splash when its manifest entry carries `casefiles` (Josh's container
// field). Nothing here is content: door names, open dates, gauge lists and paper colours all
// come from the manifest, which takes them from the desks' own files. The open date is the
// desk's own words (`opens_label`) and the device's own date (`opens_on`); it is never worked
// out here.
//
// Behind a casefile door (Will's ruled spec 2026-10-26 19:52, BK: "Group doors, for josh should
// look like the casefile...color as copied...all materials for that casefile reside (doc
// assist, etc)"): that casefile's gauges, its Doc Assist documents, and Door C's Blueprint.
// ============================================================
import { SkillGauges, roomSkills } from './ladder.jsx'
import { DocAssistHome, paperOf } from './docassist.jsx'
import { WritingLabCards } from './writinglab.jsx'

const PREVIEW_DOORS = (() => { try { return new URLSearchParams(window.location.search).get('preview') === 'unit-doors' } catch { return false } })()
const todayLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
export const cfOpen = cf => PREVIEW_DOORS || !cf?.opens_on || todayLocal() >= String(cf.opens_on)

export const usesSplash = unit => Array.isArray(unit?.casefiles) && unit.casefiles.length > 0

const isUS = course => /us11r|^us$/.test(String(course?.id || course || ''))

// ── words: BK 2026-10-30 13:37 "yes to all" (proof 2, items 1–11) ──
export const SPLASH_WORDS = {
  skillsIntro: 'Start here. Open a casefile to climb its gauges.',
  casefile: id => `Casefile ${id}`,
  opens: label => `Opens ${label}`,
  open: 'Open',
  coming: 'Coming',
  copy: p => `${p.name} Copy`,
  next: 'Know Your Next Step',
  nextLine: 'Got a test back? Start here.',
  atlas: 'Atlas',
  atlasLine: 'Every map from this unit.',
  review: 'Unit Test Review',
  reviewLine: 'The unit review, and Part I practice for this unit’s test.',
  // behind a casefile door
  gauges: 'Your gauges',
  docs: 'The documents',
  // Door 4
  nextIntro: 'Find the part you circled on Know Your Next Step. Work its gauge, then the Skills Lab room that teaches it.',
  workGauge: 'Work the gauge',
  gaugeComing: 'Gauge coming',
  labRoom: name => `Skills Lab · ${name}`,
  // Test Review
  reviewRow: 'The unit review',
  reviewRowLine: 'What to know for the test, with Quick Check answers.',
  partOne: 'Part I practice',
}
const W = SPLASH_WORDS

// The four parts of Know Your Next Step: the same four as Casefile A's bundle and Make the Case
// (words_113A.WALK_OUT: "They are the same four parts you circled on Know Your Next Step").
// Global's fourth is the Enduring Issue (P22: match US, the one real difference called out).
// Each points at the Skills Lab room that teaches its move — Josh's mapping, BK 13:37 "yes to all".
const NEXT_PARTS = course => [
  { code: 'HC', room: 'make-the-case', roomName: 'Make the Case' },
  { code: 'TH', room: 'make-the-case', roomName: 'Make the Case' },
  { code: 'DU', room: 'call-your-witness', roomName: 'Call Your Witness' },
  { code: isUS(course) ? 'CP' : 'EI', room: 'read-the-doc', roomName: 'Read the Doc' },
]

function DoorCard({ id, title, sub, paper, open, label, onOpen, kind }) {
  const style = paper ? { '--paper': paper.sheet, '--paper-tint': paper.tint } : undefined
  const cls = `us-door${paper ? ' paper' : ''}${open ? '' : ' shut'}${kind ? ` ${kind}` : ''}`
  const body = (
    <>
      <span className="us-door-id">{title}</span>
      {sub && <span className="us-door-sub">{sub}</span>}
      {paper && <span className="us-door-copy"><span className="us-swatch" aria-hidden="true" />{W.copy(paper)}</span>}
      <span className={`flag ${open ? 'live' : 'soon'}`}>{label}</span>
    </>
  )
  return open
    ? <button type="button" id={id} className={cls} style={style} onClick={onOpen}>{body}</button>
    : <div id={id} className={cls} style={style} aria-disabled="true">{body}</div>
}

// ── the splash itself ──
export function UnitSplash({ course, unit, maps, testReviewReady, onOpenCasefile, onOpenNextStep, onOpenAtlas, onOpenTestReview }) {
  const cfs = unit.casefiles || []
  return (
    <div className="us-splash">
      <div className="us-doors">
        {cfs.map(cf => {
          const open = cfOpen(cf)
          return (
            <DoorCard key={cf.id} id={`us-door-${cf.id}`} title={W.casefile(cf.id)} sub={cf.label}
                      paper={paperOf(unit.doc_assist?.paper, cf.id)} open={open}
                      label={open ? W.open : (cf.opens_label ? W.opens(cf.opens_label) : W.coming)}
                      onOpen={() => onOpenCasefile(cf.id)} />
          )
        })}
        <DoorCard id="us-door-next" kind="next" title={W.next} sub={W.nextLine} open label={W.open} onOpen={onOpenNextStep} />
      </div>
      <div className="us-cards">
        <DoorCard id="us-card-atlas" kind="side" title={W.atlas} sub={W.atlasLine} open={maps.length > 0}
                  label={maps.length ? W.open : W.coming} onOpen={onOpenAtlas} />
        <DoorCard id="us-card-review" kind="side" title={W.review} sub={W.reviewLine} open={testReviewReady}
                  label={testReviewReady ? W.open : (unit.test_review?.opens_label ? W.opens(unit.test_review.opens_label) : W.coming)}
                  onOpen={onOpenTestReview} />
      </div>
    </div>
  )
}

// ── behind a casefile door ──
export function CasefileRoomBody({ course, unit, cf, prog, daPack, wl, partThreeLabel, onOpenSkill, onOpenDoc, onOpenSet }) {
  const paper = paperOf(unit.doc_assist?.paper, cf?.id)
  const docs = daPack ? { ...daPack, tile: null, casefiles: (daPack.casefiles || []).filter(c => c.id === cf?.id) } : null
  const hasDocs = !!docs && docs.casefiles.some(c => c.status === 'open' && (c.docs || []).length)
  return (
    <div className={`us-cf${paper ? ' paper' : ''}`} style={paper ? { '--paper': paper.sheet, '--paper-tint': paper.tint } : undefined}>
      <div className="us-cf-mast">
        <span className="us-door-id">{W.casefile(cf.id)}</span>
        {cf.label && <span className="us-door-sub">{cf.label}</span>}
        {paper && <span className="us-door-copy"><span className="us-swatch" aria-hidden="true" />{W.copy(paper)}</span>}
      </div>
      {cf.blurb && <p className="room-sub">{cf.blurb}</p>}
      <h3 className="room-section">{W.gauges}</h3>
      <SkillGauges course={course} unit={unit} prog={prog} only={cf?.skills || []} onOpen={onOpenSkill} />
      {hasDocs && (
        <>
          <h3 className="room-section">{W.docs}</h3>
          <DocAssistHome pack={docs} paper={unit.doc_assist?.paper} onOpenDoc={onOpenDoc} />
        </>
      )}
      {/* Door C carries the Blueprint (BK 13:07 "Blueprint can live in C"). */}
      {String(cf.id).toUpperCase() === 'C' && wl?.length > 0 && (
        <>
          <h3 className="room-section">{partThreeLabel}</h3>
          <WritingLabCards sets={wl} onOpen={onOpenSet} lane={partThreeLabel} />
        </>
      )}
    </div>
  )
}

// ── Door 4: Know Your Next Step ──
export function NextStepBody({ course, unit, prog, onOpenGauge, onOpenLab }) {
  const skills = roomSkills(course, unit)
  const lines = course.skill_lines || []
  return (
    <>
      <p className="us-next-intro">{W.nextIntro}</p>
      <div className="us-next">
        {NEXT_PARTS(course).map(p => {
          const s = skills.find(x => x.code === p.code)
          const name = s?.name || lines.find(l => l.code === p.code)?.label || p.code
          const ready = !!(s?.live && s?.ladder)
          return (
            <section key={p.code} className="us-next-card" aria-label={name}>
              <h3 className="us-next-name">{name}</h3>
              {ready
                ? <button type="button" className="practice-row" onClick={() => onOpenGauge(p.code)}><span>{W.workGauge}</span><span className="flag live">{W.open}</span></button>
                : <div className="practice-row off"><span>{W.workGauge}</span><span className="flag soon">{W.gaugeComing}</span></div>}
              <button type="button" className="practice-row" onClick={() => onOpenLab(p.room)}><span>{W.labRoom(p.roomName)}</span><span className="flag live">{W.open}</span></button>
            </section>
          )
        })}
      </div>
    </>
  )
}

export const SPLASH_STYLES = `
.us-splash{margin-top:6px}
.us-doors{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:16px;margin-bottom:18px}
.us-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:16px;margin-bottom:28px}
.us-door{display:flex;flex-direction:column;align-items:flex-start;gap:4px;text-align:left;width:100%;min-height:150px;padding:18px 18px 16px;
  border-radius:12px;background:var(--card);border:2px solid var(--edge);color:var(--white);font:inherit;cursor:pointer;
  box-shadow:0 3px 12px rgba(0,0,0,.3)}
button.us-door:hover{border-color:var(--gold);transform:translateY(-2px)}
button.us-door:focus-visible{outline:3px solid var(--gold-lit);outline-offset:2px}
.us-door-id{font-family:'Barlow Condensed',sans-serif;font-size:29px;line-height:1.05;letter-spacing:.02em;text-transform:uppercase}
.us-door-sub{font-size:16px;line-height:1.4;color:var(--grey)}
.us-door .flag{margin-top:auto}
/* "Looks like the casefile, colour as copied" (Will's spec, BK 10/26): the sheet is the paper, ink stays dark. */
.us-door.paper,.us-cf.paper .us-cf-mast{background:var(--paper);border-color:var(--paper-tint);color:#1C1710}
.us-door.paper .us-door-sub,.us-cf.paper .us-cf-mast .us-door-sub{color:#3A3226}
.us-door-copy{display:inline-flex;align-items:center;gap:6px;font-size:13px;letter-spacing:.05em;text-transform:uppercase;color:inherit;opacity:.9}
.us-swatch{width:12px;height:12px;border-radius:3px;background:var(--paper-tint);border:1px solid rgba(0,0,0,.35)}
.us-door.shut{cursor:default;border-style:dashed;box-shadow:none}
.us-door.shut .us-door-id{opacity:.85}
.us-door.paper.shut{filter:saturate(.55)}
.us-door.next{border-color:var(--gold)}
.us-door.side{min-height:120px}
.us-door.side .us-door-id{font-size:24px}
.us-cf-mast{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 14px;padding:14px 16px;border-radius:12px;margin-bottom:12px;
  background:var(--card);border:2px solid var(--edge)}
.us-next-intro{display:inline-block;padding:8px 13px;border-radius:9px;background:color-mix(in srgb,var(--canvas) 85%,transparent);color:var(--white);
  font-size:17px;line-height:1.55;margin:0 0 16px;max-width:760px}
.us-next{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
.us-next-card{background:var(--card);border:1px solid var(--edge);border-radius:12px;padding:14px 14px 10px;box-shadow:0 2px 10px rgba(0,0,0,.25)}
.us-next-name{font-family:'Barlow Condensed',sans-serif;font-size:24px;color:var(--white);margin:0 0 10px}
.us-next-card .practice-row{margin-bottom:8px}
@media (max-width:560px){.us-door{min-height:118px}.us-door-id{font-size:25px}}
`
