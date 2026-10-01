// ============================================================
// BK'S OFFICE — the third splash door, shared by both courses.
// Built 2026-09-27 by Josh from Leo's order (2026-09-26 23:35, amended 00:31).
//
// BK's rulings this file keeps:
//   • One theme per MONTH (US and Global run different unit calendars). The
//     current month is open and past months stay open. Future months stay hidden.
//   • The path unlocks in order: lesson → practice set → mystery deep dive →
//     the bonus. News links sit alongside and never gate anything.
//   • NO SCORE anywhere in the room. Not a count, not a percent, not a streak.
//   • The prize is the building's pink Hawk Proud Coupon, which BK writes by hand, earned in the PINK BOX, the
//     4th stop in every theme (Leo's ruling 2026-09-29 12:30). The Arena runs no draw
//     and awards nothing; the building's Friday table does the drawing. Completion
//     grades come only from the current month's bonus, which BK reads.
//   • The finish email never prints BK's address or the district domain. It says
//     "send to Mr. Kelley at his school email" (ruling 5, verbatim, from the manifest).
//   • The frame is the building's own: Be a Hawk. Its four words come from the
//     manifest exactly as the building says them. Never retyped here.
//
// Ed Law 2-d: what this room remembers is LEVEL NUMBERS ONLY, through the same
// `arena_progress_v1` store and the same clean() contract as the gauges:
// { "office:<theme-slug>": { "BK": [1,2,3] } } means lesson, practice and mystery
// are done. No names, no answers, nothing typed. The finish code is RETIRED (Leo's
// ruling 2026-09-27 09:22, BK "yes 1-5"): the finish screen shows one of the theme's
// three proof questions, picked at random in page memory, and drops it into the email.
// The Arena never checks the answer; BK reads it. The student sends the email from
// their own school account. BK's inbox is the record. The Arena knows no one.
//
// Josh wrote no student-facing words in the theme. Every such string lives in the
// manifest or the theme file, and anything still marked PLACEHOLDER renders in a
// dashed box so nobody mistakes it for approved copy.
// ============================================================
import { useState, useMemo, useRef } from 'react'

export const OFFICE_SKILL = 'BK'
export const officeUnit = theme => ({ slug: theme.slug })
export const OFFICE_COURSE = { id: 'office' }

export const isPlaceholder = s => typeof s === 'string' && /^PLACEHOLDER\b/.test(s)

// Anything marked PLACEHOLDER shows as a dashed, striped box: visible to BK in the
// preview, impossible to mistake for approved copy. The gate keeps it off main.
export function T({ children, as: Tag = 'span', className = '' }) {
  const ph = isPlaceholder(children)
  return <Tag className={`${className}${ph ? ' ph' : ''}`}>{children}</Tag>
}

// Month key from the DEVICE clock, "YYYY-MM". A kid's Chromebook clock is the
// only clock the Arena has; there is no server to ask.
export function monthNow(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Today as "YYYY-MM-DD" from the DEVICE clock, local time (same clock as monthNow).
export function todayNow(d = new Date()) {
  return `${monthNow(d)}-${String(d.getDate()).padStart(2, '0')}`
}

// ── WHICH BONUS STEPS A THEME SHOWS ─────────────────────────────────────────
// Leo's ruling 2026-09-28 21:59, amended 2026-09-29 12:30 (BK 12:29). A theme's bonus
// is a Completion grade only through its bonus_due date (no late band). After that, and
// on any theme with no due date, the bonus earns nothing: it stays open to do, and its
// graded line (bonus_due_line, matched exactly) is left out. No status line replaces
// it: the Hawk Proud Coupon lives in the pink box now, not in the bonus.
export function bonusSteps(theme, bonus, today = todayNow()) {
  const steps = bonus?.instructions || []
  const graded = !!theme?.bonus_due && today <= String(theme.bonus_due)
  return graded || !theme?.bonus_due_line ? steps : steps.filter(s => s !== theme.bonus_due_line)
}

export function officeVisible(office, preview) {
  return !!office && (office.published === true || preview)
}

// Past and current months, newest first. In preview, every theme shows, labeled.
export function visibleThemes(office, preview, now = monthNow()) {
  return (office?.themes || [])
    .filter(t => preview || (t.published === true && String(t.month) <= now))
    .sort((a, b) => String(b.month).localeCompare(String(a.month)))
}

// ── THE PROOF QUESTION ───────────────────────────────────────────────────
// One of the theme's three, picked when the finish screen opens. Held in page memory
// only: leave and come back and you may get a different one. Either is fine.
export function pickProof(list, random = Math.random) {
  const qs = (list || []).filter(q => typeof q === 'string' && q.trim())
  return qs.length ? qs[Math.floor(random() * qs.length)] : null
}

// Copy to the clipboard without sending anything anywhere. Falls back to a
// selected textarea for browsers that block the async clipboard.
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true } catch { /* fall through */ }
  try {
    const ta = document.createElement('textarea')
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'
    document.body.appendChild(ta); ta.select()
    const ok = document.execCommand('copy'); document.body.removeChild(ta); return ok
  } catch { return false }
}

// ── THE DOOR (on the splash, third of three) ─────────────────────────────
export function OfficeDoor({ office, onOpen, preview }) {
  return (
    <a className="door office-door has-art" href="#/office"
       onClick={e => { e.preventDefault(); onOpen() }}>
      <div className="door-art" aria-hidden="true">
        <img src={`/${office.background_small || office.background}`} alt="" loading="lazy" />
      </div>
      <div className="door-accent" style={{ background: 'var(--gold)' }} />
      <div className="door-label">{office.label}</div>
      {office.blurb && <T as="div" className="door-blurb">{office.blurb}</T>}
      <span className="flag live">{preview && !office.published ? 'Preview' : 'Open'}</span>
    </a>
  )
}

// The building's four words, exactly as given. The pattern marks beside each
// word are shape, not colour, so the frame reads in greyscale too.
export function HawkFrame({ frame, compact = false }) {
  if (!frame) return null
  return (
    <div className={`hawk-frame${compact ? ' compact' : ''}`}>
      <div className="hawk-title">{frame.title}</div>
      <ul className="hawk-traits">
        {(frame.traits || []).map(t => <li key={t}>{t}</li>)}
      </ul>
      {frame.tagline && <div className="hawk-tagline">{frame.tagline}</div>}
    </div>
  )
}

// ── THE ROOM ─────────────────────────────────────────────────────────────
export function OfficeRoom({ office, preview, onOpenTheme, onBack, ui }) {
  const { ScreenHeader, BottomBack } = ui
  const themes = visibleThemes(office, preview)
  const now = monthNow()
  const current = themes.find(t => String(t.month) <= now) || themes[0]
  return (
    <div className="wrap office">
      <ScreenHeader label={office.label} onBack={onBack} color="var(--gold)" back="The Arena" />

      {/* The picture is a stage. On a wide screen the title sits on the chalkboard
          and this month's theme is pinned to the corkboard. On a phone the picture
          is a banner and the same things sit under it. */}
      <div className="office-stage">
        <picture>
          <source media="(max-width: 700px)" srcSet={`/${office.background_small}`} />
          <img src={`/${office.background}`} alt={office.background_alt || ''} />
        </picture>
        <div className="on-chalkboard" aria-hidden="true">
          <div className="chalk-title">{office.label}</div>
          {office.frame?.title && <div className="chalk-sub">{office.frame.title}</div>}
        </div>
        {current && (
          <button type="button" className="on-corkboard pinned-note" onClick={() => onOpenTheme(current.slug)}
                  aria-label={`${current.month_label}: ${current.title}. Open.`}>
            <span className="pin" aria-hidden="true" />
            <span className="note-month">{current.month_label}</span>
            <span className="note-title">{current.title}</span>
          </button>
        )}
      </div>

      <h1 className="office-h1">{office.label}</h1>
      {office.intro && <T as="p" className="office-intro">{office.intro}</T>}
      <HawkFrame frame={office.frame} />

      <h3 className="room-section">By month</h3>
      {/* Oldest first, left to right (BK 2026-09-29 11:34): the months read in the
          order a kid should work them, so October points back to September. */}
      <div className="office-themes">
        {[...themes].sort((a, b) => String(a.month).localeCompare(String(b.month))).map(t => (
          <button key={t.slug} type="button" className="card theme-card" onClick={() => onOpenTheme(t.slug)}>
            <span className="theme-month">{t.month_label}</span>
            <span className="theme-title">{t.title}</span>
            <span className="flag live">
              {t === current ? 'This month' : String(t.month) > now ? 'Preview: not open yet' : 'Open'}
            </span>
            {preview && !t.published && <span className="flag building">Not published</span>}
          </button>
        ))}
        {!themes.length && <p className="office-intro">No themes are open yet.</p>}
      </div>
      <BottomBack onBack={onBack} back="The Arena" />
    </div>
  )
}

// ── ONE THEME ────────────────────────────────────────────────────────────
// The pink box is stop 4 (Leo's ruling 2026-09-29 12:30). Progress stays level
// numbers only: a device that had [1,2,3] now opens on the pink box.
// A theme can drop the pink box (BK 2026-10-01 11:07: October's Hawk portion is
// eliminated; BK writes coupons for completed assignments instead).
const hawkOn = (office, theme) => !!office?.hawk_box && theme?.hawk_box !== false
const stepsFor = (office, theme) => [
  { n: 1, key: 'lesson', label: 'Lesson' },
  { n: 2, key: 'practice', label: 'Practice set' },
  { n: 3, key: 'mystery', label: 'Mystery deep dive' },
  ...(hawkOn(office, theme) ? [{ n: 4, key: 'hawk', label: office.hawk_box.label, pink: true }] : []),
  { n: hawkOn(office, theme) ? 5 : 4, key: 'bonus', label: 'Bonus' },
]

// ── THE BACK LINK (theme 2 on; BK 2026-09-28 22:11: "point people back to the
// beginning if they skip it") ──
// The words are the theme file's own. It shows above the path, on every visit,
// and only when the theme it points to is open on this device. One tap opens it.
function BackLink({ link, themes, current, onOpenTheme }) {
  if (!link?.text || !onOpenTheme) return null
  // Theme n is the nth month the Office has run: September = 1, October = 2.
  const ordered = [...(themes || [])].sort((a, b) => String(a.month).localeCompare(String(b.month)))
  const target = ordered[Number(link.theme) - 1]
  if (!target || target.slug === current.slug) return null
  return (
    <button type="button" className="back-link-card" onClick={() => onOpenTheme(target.slug)}>
      <span className="back-link-mark" aria-hidden="true">↩</span>
      <span className="back-link-text">{link.text}</span>
    </button>
  )
}

export function OfficeTheme({ office, theme, themes, pack, done, onDone, onBack, onOpenTheme, ui }) {
  const { ScreenHeader, BottomBack, McItem } = ui
  const STEPS = stepsFor(office, theme)
  const LAST = STEPS[STEPS.length - 1].n
  // Step n is open when every step before it is done. The lesson is always open.
  const isDone = n => done.includes(n)
  const isOpenStep = n => n === 1 || [...Array(n - 1)].every((_, i) => isDone(i + 1))
  const firstOpen = STEPS.find(s => isOpenStep(s.n) && !isDone(s.n))?.n || LAST
  const [step, setStep] = useState(firstOpen)
  const topRef = useRef(null)
  const go = n => { if (isOpenStep(n)) { setStep(n); topRef.current?.scrollIntoView({ block: 'start' }) } }
  // The done-list arrives from the parent on the next render, so the step just
  // finished opens the next one directly instead of asking isOpenStep() too early.
  const finish = n => { onDone(n); setStep(n + 1); topRef.current?.scrollIntoView({ block: 'start' }) }

  return (
    <div className="office-theme-bg" style={{ '--office-bg': `url(/${office.background})` }}>
      <div className="wrap office">
        <ScreenHeader label={theme.title} onBack={onBack} color="var(--gold)" back={office.label} />
        <div className="theme-head">
          <div>
            <div className="theme-month">{theme.month_label}</div>
            <h1 className="office-h1">{theme.title}</h1>
          </div>
          <HawkFrame frame={office.frame} compact />
        </div>

        {pack === null && <div className="loading">Opening the theme&hellip;</div>}
        {pack === false && <div className="empty"><div className="empty-title">This theme is not built yet.</div></div>}
        {pack && <>
          <BackLink link={pack.back_link} themes={themes} current={theme} onOpenTheme={onOpenTheme} />
          {/* The path. Each stop says in WORDS whether it is done, open or still
              locked; the gold ring marks the one you are on, and is never the only signal.
              (Orange is the growth needle's colour and nothing else's, per the token file.) */}
          <ol className="office-path" ref={topRef} aria-label="Theme path">
            {STEPS.map(s => {
              const open = isOpenStep(s.n), d = isDone(s.n), here = step === s.n
              return (
                <li key={s.n}>
                  <button type="button" className={`path-stop${here ? ' here' : ''}${d ? ' done' : ''}`}
                          disabled={!open} aria-current={here ? 'step' : undefined} onClick={() => go(s.n)}>
                    <span className={`stop-mark${s.pink ? ' pink' : ''}`} aria-hidden="true">{d ? '✓' : open ? s.n : '🔒'}</span>
                    <span className="stop-label">{s.label}</span>
                    <span className="stop-state">{d ? 'Done' : open ? (here ? 'You are here' : 'Open') : 'Locked'}</span>
                  </button>
                </li>
              )
            })}
          </ol>

          <div className="office-grid">
            <div className="office-main">
              {step === 1 && <Lesson lesson={pack.lesson} frame={office.frame} done={isDone(1)} onFinish={() => finish(1)} />}
              {step === 2 && <OfficeSet set={pack.practice} McItem={McItem} done={isDone(2)} onFinish={() => finish(2)} next="the mystery" />}
              {step === 3 && <OfficeSet set={pack.mystery} McItem={McItem} done={isDone(3)} onFinish={() => finish(3)} titled />}
              {step === 4 && hawkOn(office, theme) && <HawkBox box={office.hawk_box} frame={office.frame} done={isDone(4)} onFinish={() => finish(4)} />}
              {step === LAST && <Finish office={office} theme={theme} bonus={pack.bonus} coaching={pack.coaching} proof={pack.proof_questions} />}
            </div>
            <aside className="office-aside">
              <NewsLinks news={pack.news} />
            </aside>
          </div>
        </>}
        <BottomBack onBack={onBack} back={office.label} />
      </div>
    </div>
  )
}

function Lesson({ lesson, frame, done, onFinish }) {
  if (!lesson) return null
  const traits = frame?.traits || []
  // Cards sort under the building's four words, in the building's order.
  const cards = [...(lesson.cards || [])].sort((a, b) => traits.indexOf(a.trait) - traits.indexOf(b.trait))
  return (
    <section className="office-panel">
      <h2 className="panel-h">Lesson</h2>
      {lesson.intro && <T as="p" className="panel-intro">{lesson.intro}</T>}
      <div className="lesson-cards">
        {cards.map((c, i) => (
          <article key={i} className="lesson-card">
            <div className="trait-chip">{c.trait}</div>
            <T as="h3" className="lesson-h">{c.heading}</T>
            <T as="p" className="lesson-body">{c.body}</T>
          </article>
        ))}
      </div>
      <StepDone done={done} onFinish={onFinish} label="I read these" />
    </section>
  )
}

function OfficeSet({ set, McItem, done, onFinish, titled }) {
  const items = set?.items || []
  const [answered, setAnswered] = useState(() => new Set())
  if (!set) return null
  const all = items.length > 0 && answered.size >= items.length
  return (
    <section className="office-panel">
      {titled && set.title ? <T as="h2" className="panel-h">{set.title}</T> : <h2 className="panel-h">{titled ? 'Mystery deep dive' : 'Practice set'}</h2>}
      {set.intro && <T as="p" className="panel-intro">{set.intro}</T>}
      {/* Leo's porting note 3: "The skill underneath" shows under the hook. */}
      {set.underneath && <p className="panel-intro underneath"><b>The skill underneath:</b> {set.underneath}</p>}
      {items.map((it, i) => (
        <McItem key={it.n ?? i} item={it} n={i + 1} total={items.length}
                onAnswer={() => setAnswered(s => new Set(s).add(i))} />
      ))}
      {/* Answering every question opens the next step. Right or wrong does not
          matter here: nothing is counted, and nothing about the answers is kept. */}
      {(all || done) && <StepDone done={done} onFinish={onFinish} label="On to the next step" />}
    </section>
  )
}

// THE PINK BOX, drawn as the building's own coupon (BK 2026-09-29 12:49: "use the visual...
// make it pop"): pink stock, a black frame with notched corners and an orange rule inside
// it, the HAWK PROUD / COUPON heading, a BE A HAWK ribbon, and the building's four traits
// in the coupon's two-by-two grid. Every word is the manifest's or the building's frame;
// the ruled instructions sit on the coupon under the grid. The check boxes are drawing,
// not controls: nothing on this card is tapped or stored. The mascot art is left out.
function HawkBox({ box, frame, done, onFinish }) {
  const [top, bottom] = box.title_lines || [box.label, null]
  const traits = frame?.traits || []
  return (
    <section className="office-panel coupon-panel">
      <div className="coupon" role="group" aria-label={box.label}>
        <div className="coupon-in">
          <div className="coupon-title" aria-hidden="true">
            <span className="coupon-top">{top}</span>
            {bottom && <span className="coupon-ribbon">{bottom}</span>}
          </div>
          <h2 className="sr-only">{box.label}</h2>
          {frame?.title && <div className="coupon-banner">{frame.title}</div>}
          <ul className="coupon-traits">
            {traits.map(t => <li key={t}><span className="coupon-check" aria-hidden="true" />{t}</li>)}
          </ul>
          <T as="p" className="coupon-text">{box.text}</T>
        </div>
      </div>
      <StepDone done={done} onFinish={onFinish} label="On to the next step" />
    </section>
  )
}

function StepDone({ done, onFinish, label }) {
  return (
    <div className="step-done">
      {done
        ? <span className="flag live">Done</span>
        : <button type="button" className="btn-primary" onClick={onFinish}>{label}</button>}
    </div>
  )
}

function NewsLinks({ news }) {
  const list = news || []
  if (!list.length) return null
  return (
    <section className="office-panel news">
      <h2 className="panel-h">In the news</h2>
      {list.map((n, i) => {
        // A link shows as a link ONLY when it has a URL and has been checked against
        // the school web filter. Otherwise it is a card with no link at all.
        // filter_checked is true, or BK's recorded decision to ship now and check on a
        // school Chromebook himself (theme 1: "BK ships 09-27; checks Mon 09-28").
        const live = n.url && (n.filter_checked === true || (typeof n.filter_checked === 'string' && /^BK\b/.test(n.filter_checked)))
        return (
          <div key={i} className="news-card">
            {live
              ? <a href={n.url} target="_blank" rel="noopener noreferrer" className="news-title">{n.title}</a>
              : <T as="div" className="news-title">{n.title}</T>}
            {n.source && <T as="div" className="news-source">{n.source}</T>}
            {n.question && <T as="p" className="news-q">{n.question}</T>}
            {!live && <div className="news-pending">Link not posted yet</div>}
          </div>
        )
      })}
    </section>
  )
}

function Finish({ office, theme, bonus, coaching, proof }) {
  const c = office.finish?.classroom || {}
  const question = useMemo(() => pickProof(proof), [proof])
  const steps = bonusSteps(theme, bonus)
  // TURN IT IN (BK 2026-10-01 10:55-11:07): no email. The page names the theme's Google
  // Classroom assignment exactly as it is titled, and shows the attached doc's two spaces
  // under the doc's own labels. Nothing is sent and nothing links into Classroom.
  // A theme with no assignment (September) shows no turn-in card.
  // After the theme's due date the assignment is closed, and a past month earns nothing
  // (Leo's ruling 09-28, BK 22:17), so the card goes away with the graded line.
  const open = !theme?.bonus_due || todayNow() <= String(theme.bonus_due)
  const assignment = open ? theme.classroom_assignment : null
  const fill = t => String(t || '').replace('{proof}', question || '')
  return (
    <section className="office-panel finish">
      <h2 className="panel-h">Bonus</h2>
      {bonus?.title && <T as="h3" className="lesson-h">{bonus.title}</T>}
      <ol className="bonus-steps">
        {steps.map((s, i) => <T as="li" key={i}>{s}</T>)}
      </ol>

      {assignment && c.heading && (
        <div className="email-card turnin-card" aria-labelledby="turnin-h">
          <h3 id="turnin-h" className="email-h">{c.heading}</h3>
          {c.line && (
            <p className="send-line">
              {c.line.split('{assignment}')[0]}<b className="turnin-name">{assignment}</b>{c.line.split('{assignment}')[1]}
            </p>
          )}
          {(c.spaces || []).filter(sp => !String(sp.fill).includes('{proof}') || question).map((sp, i) => (
            <div key={i} className="turnin-space">
              <div className="email-label">{sp.label}</div>
              <div className="turnin-fill">{fill(sp.fill)}</div>
            </div>
          ))}
        </div>
      )}
      {(coaching || []).length > 0 && <p className="coach-line">{coaching[0]}</p>}
    </section>
  )
}

// ── STYLES ───────────────────────────────────────────────────────────────
export const OFFICE_STYLES = `
/* PLACEHOLDER copy: dashed and striped so no one mistakes it for approved words.
   Reviewer-only; the gate keeps them off main. Signal red, per BK's option A. */
.ph{outline:2px dashed var(--arena-signal);outline-offset:2px;border-radius:4px;
  background:repeating-linear-gradient(135deg,transparent 0 10px,color-mix(in srgb,var(--arena-signal) 14%,transparent) 10px 20px)}
.preview-banner{position:relative;z-index:50;background:var(--arena-signal);color:var(--canvas);
  font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.12em;font-size:14px;
  text-align:center;padding:7px 12px;font-weight:700}

/* The door: same card as the course doors, with a window into the room. */
.office-door .door-art img{object-position:center 42%}

/* The stage: the picture, with the title on the chalkboard and this month pinned to the corkboard. */
.office-stage{position:relative;max-width:1100px;margin:6px auto 20px;border-radius:14px;overflow:hidden;
  border:1px solid var(--edge);box-shadow:var(--arena-lift)}
.office-stage img{display:block;width:100%;height:auto;aspect-ratio:1024/572}
.on-chalkboard{position:absolute;left:52.3%;top:36.5%;width:18.8%;height:21%;display:flex;flex-direction:column;
  align-items:center;justify-content:center;text-align:center;pointer-events:none}
.chalk-title{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;color:#F3F1E6;
  font-size:clamp(14px,2.7vw,34px);line-height:1;letter-spacing:.04em;text-shadow:0 0 1px #fff,0 0 6px rgba(255,255,255,.35);opacity:.93}
.chalk-sub{font-family:'Barlow Condensed',sans-serif;color:#F3F1E6;opacity:.8;font-size:clamp(10px,1.4vw,18px);
  letter-spacing:.2em;text-transform:uppercase;margin-top:6px}
.on-corkboard{position:absolute;left:38.5%;top:40%;width:11%;min-height:13%;padding:10px 8px 8px}
.pinned-note{background:#FFF6D8;color:#2A2113;border:0;border-radius:2px;transform:rotate(-2.5deg);
  box-shadow:0 6px 14px rgba(0,0,0,.45);display:flex;flex-direction:column;gap:3px;text-align:left;cursor:pointer}
.pinned-note:hover{transform:rotate(-1deg) translateY(-2px)}
.pinned-note .pin{position:absolute;top:-5px;left:50%;width:12px;height:12px;margin-left:-6px;border-radius:50%;
  background:#B8322A;box-shadow:0 2px 3px rgba(0,0,0,.5)}
.note-month{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.14em;
  font-size:clamp(9px,1vw,12px);color:#6A4B12}
.note-title{font-family:'Barlow Condensed',sans-serif;font-size:clamp(11px,1.45vw,18px);line-height:1.05;color:#2A2113}
@media (max-width:760px){ .on-chalkboard,.on-corkboard{display:none} }

.office-h1{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;color:var(--white);
  font-size:clamp(34px,6vw,54px);line-height:.98;margin:6px 0 10px}
.office-intro{color:var(--white);font-size:18px;line-height:1.6;max-width:720px;margin:0 0 18px}

/* Be a Hawk: four words, each with its own shape mark, so it reads without colour. */
.hawk-frame{display:inline-block;background:var(--card);border:1px solid var(--edge);border-left:4px solid var(--gold);
  border-radius:12px;padding:14px 18px;margin:0 0 22px;box-shadow:var(--arena-lift)}
.hawk-title{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.16em;color:var(--gold);font-size:15px}
.hawk-traits{list-style:none;display:flex;flex-wrap:wrap;gap:8px 18px;margin:8px 0 6px;padding:0}
.hawk-traits li{color:var(--white);font-size:17px;font-weight:600;display:flex;align-items:center;gap:7px}
.hawk-traits li::before{content:'';width:9px;height:9px;background:var(--gold);transform:rotate(45deg);display:inline-block}
.hawk-tagline{color:var(--gold-lit);font-style:italic;font-size:15.5px}
.hawk-frame.compact{padding:10px 14px;margin:0}
.hawk-frame.compact .hawk-traits li{font-size:14.5px}

.office-themes{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px;margin-bottom:10px}
button.theme-card{display:flex;flex-direction:column;align-items:flex-start;gap:6px;text-align:left;padding:18px;
  background:var(--card);border-radius:12px;color:var(--white);cursor:pointer}
button.theme-card:hover{background:var(--card-lit);border-color:var(--gold)}
.theme-month{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.16em;color:var(--gold);font-size:14px}
.theme-title{font-family:'Barlow Condensed',sans-serif;font-size:26px;line-height:1.05}

/* A theme page: the room behind, dimmed hard enough that type keeps its contrast. */
.office-theme-bg{position:relative;min-height:100vh}
.office-theme-bg::before{content:'';position:fixed;inset:0;z-index:0;background-image:var(--office-bg);
  background-size:cover;background-position:center 40%}
.office-theme-bg::after{content:'';position:fixed;inset:0;z-index:0;
  background:linear-gradient(180deg,color-mix(in srgb,var(--canvas) var(--scrim-in-top),transparent),color-mix(in srgb,var(--canvas) var(--scrim-in-low),transparent) 40%)}
.office-theme-bg > .wrap{position:relative;z-index:1}
.theme-head{display:flex;flex-wrap:wrap;gap:18px;align-items:flex-end;justify-content:space-between;margin-bottom:18px}

.office-path{list-style:none;display:grid;grid-template-columns:repeat(5,1fr);gap:10px;padding:0;margin:0 0 20px;scroll-margin-top:12px}
.path-stop{width:100%;display:flex;flex-direction:column;align-items:flex-start;gap:3px;padding:12px 14px;text-align:left;
  background:var(--card);border:1px solid var(--edge);border-radius:10px;color:var(--white);cursor:pointer;box-shadow:var(--arena-lift)}
.path-stop:disabled{cursor:default;box-shadow:none;color:var(--dim);background:color-mix(in srgb,var(--card) 92%,var(--canvas))}
.path-stop:disabled .stop-mark{border-color:var(--dim)}
.path-stop:not(:disabled), button.theme-card{border:2px solid var(--arena-signal)}
.path-stop.here{background:var(--card-lit);box-shadow:var(--arena-lift),0 0 0 3px color-mix(in srgb,var(--arena-signal) 35%,transparent)}
.path-stop.done .stop-mark{background:var(--gold);color:#1a1405}
.stop-mark{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:14px;
  border:2px solid var(--gold);color:var(--gold)}
.path-stop.here .stop-mark{border-color:var(--gold-lit);color:var(--gold-lit)}
.stop-label{font-family:'Barlow Condensed',sans-serif;font-size:19px;line-height:1.05}
.stop-state{font-size:12.5px;color:var(--grey);text-transform:uppercase;letter-spacing:.08em}
@media (max-width:640px){ .office-path{grid-template-columns:repeat(2,1fr)} }

.office-grid{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:20px;align-items:start}
@media (max-width:900px){ .office-grid{grid-template-columns:1fr} }
.office-panel{background:color-mix(in srgb,var(--card) 94%,transparent);border:1px solid var(--edge);border-radius:14px;
  padding:20px;box-shadow:var(--arena-lift)}
.panel-h{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.06em;color:var(--gold);font-size:24px;margin:0 0 8px}
.panel-intro{color:var(--white);font-size:17px;line-height:1.6;margin:0 0 16px}

.lesson-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px}
.lesson-card{background:#FBF3DE;color:#2A2113;border-radius:6px;padding:16px 16px 14px;box-shadow:0 5px 14px rgba(0,0,0,.4)}
.trait-chip{display:inline-flex;align-items:center;gap:6px;font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;
  letter-spacing:.1em;font-size:13px;color:#5B420E;border:1.5px solid #8A6A1E;border-radius:999px;padding:2px 10px;margin-bottom:8px}
.trait-chip::before{content:'';width:7px;height:7px;background:#8A6A1E;transform:rotate(45deg)}
.lesson-h{font-family:'Barlow Condensed',sans-serif;font-size:21px;line-height:1.1;margin:0 0 6px}
.lesson-body{font-size:16px;line-height:1.55;margin:0}
.lesson-card .ph{outline-color:#B8430A}

.step-done{margin-top:18px;display:flex;justify-content:flex-end}
.btn-primary{background:var(--gold);color:#1a1405;border:0;border-radius:10px;padding:12px 20px;font-weight:700;
  font-size:16px;cursor:pointer;box-shadow:var(--arena-lift)}
.btn-primary:hover{background:var(--gold-lit)}

.news-card{border-top:1px solid var(--edge);padding:12px 0}
.news-card:first-of-type{border-top:0;padding-top:4px}
.news-title{color:var(--white);font-weight:700;font-size:16.5px;line-height:1.35;display:block}
a.news-title{color:var(--gold-lit);text-decoration:underline}
.news-source{color:var(--grey);font-size:13.5px;margin-top:3px}
.news-q{color:var(--white);font-size:15px;line-height:1.5;margin:6px 0 0}
.news-pending{color:var(--dim);font-size:12.5px;text-transform:uppercase;letter-spacing:.08em;margin-top:6px}

/* The back link: a full-width card above the path. Words plus an arrow mark, so it
   reads as a way back without colour. Tap target well over 44px tall. */
.back-link-card{display:flex;align-items:center;gap:12px;width:100%;margin:0 0 16px;padding:14px 16px;min-height:52px;
  text-align:left;background:var(--card);border:2px solid var(--arena-signal);border-radius:10px;color:var(--white);
  cursor:pointer;box-shadow:var(--arena-lift);font-family:inherit;font-size:17px;line-height:1.4}
.back-link-card:hover{background:var(--card-lit);border-color:var(--gold)}
.back-link-card:focus-visible{outline:3px solid var(--gold-lit);outline-offset:2px}
.back-link-mark{flex:none;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;
  border:2px solid var(--gold);color:var(--gold);font-weight:700}
.back-link-text{font-weight:600}

/* THE COUPON (BK 2026-09-29 12:49): the building's pink Hawk Proud Coupon, in CSS.
   Ink #141414 on pink #F6A9B6 is 10.9:1; orange #F59A1F on ink is 8.6:1. The notched
   corners are a clip-path, so the lift is a drop-shadow filter, not a box-shadow. */
.coupon-panel{overflow:visible}
.coupon{--ink:#141414;--pink:#F6A9B6;--pink-lit:#FBD0D8;--orange:#F59A1F;
  max-width:640px;margin:4px auto 0;padding:6px;background:var(--ink);
  clip-path:polygon(18px 0,calc(100% - 18px) 0,100% 18px,100% calc(100% - 18px),calc(100% - 18px) 100%,18px 100%,0 calc(100% - 18px),0 18px);
  filter:drop-shadow(0 10px 18px rgba(0,0,0,.55));transform:rotate(-.6deg);animation:couponIn .45s cubic-bezier(.2,.9,.3,1.2) both}
.coupon-in{background:var(--pink);color:var(--ink);padding:18px 20px 20px;position:relative;
  clip-path:polygon(14px 0,calc(100% - 14px) 0,100% 14px,100% calc(100% - 14px),calc(100% - 14px) 100%,14px 100%,0 calc(100% - 14px),0 14px)}
.coupon-in::before{content:'';position:absolute;inset:7px;border:2.5px solid var(--orange);pointer-events:none;
  clip-path:polygon(10px 0,calc(100% - 10px) 0,100% 10px,100% calc(100% - 10px),calc(100% - 10px) 100%,10px 100%,0 calc(100% - 10px),0 10px)}
.coupon-title{display:flex;flex-direction:column;align-items:center;gap:2px;margin:2px 0 10px;position:relative}
.coupon-top{font:900 clamp(38px,7vw,58px)/.9 'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.02em;
  color:var(--pink-lit);-webkit-text-stroke:2px var(--ink);paint-order:stroke fill;
  text-shadow:3px 3px 0 var(--orange),5px 5px 0 var(--ink)}
.coupon-ribbon{display:inline-block;background:var(--orange);color:var(--ink);font:900 clamp(22px,4vw,30px)/1 'Barlow Condensed',sans-serif;
  text-transform:uppercase;letter-spacing:.18em;padding:4px 26px 3px;border:2.5px solid var(--ink);
  clip-path:polygon(0 0,100% 0,calc(100% - 12px) 50%,100% 100%,0 100%,12px 50%)}
.coupon-banner{width:max-content;max-width:100%;margin:0 auto 10px;background:var(--ink);color:var(--orange);
  font:italic 900 22px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.12em;padding:6px 22px;
  clip-path:polygon(10px 0,calc(100% - 10px) 0,100% 50%,calc(100% - 10px) 100%,10px 100%,0 50%)}
.coupon-traits{list-style:none;margin:0 0 14px;padding:10px 14px;background:var(--ink);border-radius:10px;
  display:grid;grid-template-columns:1fr 1fr;gap:8px 18px;border:2px solid var(--orange)}
.coupon-traits li{display:flex;align-items:center;gap:10px;color:var(--orange);font:800 19px/1.1 'Barlow Condensed',sans-serif;
  text-transform:uppercase;letter-spacing:.06em}
.coupon-check{flex:none;width:16px;height:16px;border:2.5px solid var(--pink-lit);border-radius:3px}
.coupon-text{font-size:17px;line-height:1.6;margin:0;color:var(--ink);font-weight:500}
@media (max-width:480px){ .coupon-traits{grid-template-columns:1fr} .coupon-in{padding:16px 14px 16px} }
@keyframes couponIn{from{opacity:0;transform:rotate(-3deg) scale(.94)}to{opacity:1;transform:rotate(-.6deg) scale(1)}}
@media (prefers-reduced-motion:reduce){ .coupon{animation:none;transform:none} }
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}

.stop-mark.pink{border-color:#F6A9B6;color:#F6A9B6}
.path-stop.done .stop-mark.pink{background:#F6A9B6;color:#141414}
.path-stop.here .stop-mark.pink{border-color:#FBD0D8;color:#FBD0D8}

.bonus-steps{color:var(--white);font-size:16.5px;line-height:1.6;padding-left:22px;margin:8px 0 18px}
.bonus-steps li{margin-bottom:6px}
.turnin-card .send-line{font-weight:400}
.turnin-name{font-weight:800;white-space:normal}
.turnin-space{margin-top:12px}
.turnin-fill{border-left:3px solid #B8955A;padding:2px 0 2px 12px;font-size:16.5px;line-height:1.5;margin-top:4px;color:#2A2113}
.email-card{background:#FBF3DE;color:#2A2113;border-radius:10px;padding:18px;box-shadow:0 5px 14px rgba(0,0,0,.4)}
.email-h{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.08em;font-size:20px;margin:0 0 4px}
.send-line{font-size:17px;font-weight:600;line-height:1.5;margin:0 0 14px}
.underneath{font-size:16px;color:var(--grey)}
.underneath b{color:var(--gold)}
.email-field{display:grid;grid-template-columns:110px minmax(0,1fr) auto;gap:10px;align-items:start;margin-bottom:10px}
@media (max-width:640px){ .email-field{grid-template-columns:1fr} }
.email-label{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.1em;font-size:14px;color:#5B420E;padding-top:6px}
.email-value{background:#fff;border:1px solid #C9B98F;border-radius:6px;padding:7px 10px;font-size:15px;
  white-space:pre-wrap;word-break:break-word;margin:0;font-family:ui-monospace,Menlo,Consolas,monospace;color:#2A2113}
.email-value.code{font-size:19px;letter-spacing:.08em;font-weight:700}
.email-card .btn-ghost{color:#2A2113;border-color:#8A6A1E;background:#fff}
.copy-status{min-height:1.4em;font-size:14.5px;margin:4px 0 0}
.eligibility{font-size:15px;margin:10px 0 0}
.coach-line{color:var(--gold-lit);font-style:italic;margin-top:14px}
`
