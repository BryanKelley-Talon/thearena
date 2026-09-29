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
//   • The prize is a Hawk pass BK writes by hand. The Arena runs no draw and
//     awards nothing. Completion points come only from the bonus BK reads.
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

// ── WHICH BONUS A THEME SHOWS (Leo's ruling 2026-09-28 21:59; BK 2026-09-29 11:21) ──
// A theme's bonus is a Completion grade only while its bonus_due date has not
// passed (through the due date itself, no late band). Every other theme, and
// every theme with no due date, shows the Hawk pass line instead, and its
// graded line (bonus_due_line, matched exactly) is left out. Unknown = Hawk pass:
// the page never promises a grade the manifest doesn't name.
export function bonusView(office, theme, bonus, today = todayNow()) {
  const steps = bonus?.instructions || []
  const graded = !!theme?.bonus_due && today <= String(theme.bonus_due)
  if (graded) return { steps, hawkLine: null }
  const shown = theme?.bonus_due_line ? steps.filter(s => s !== theme.bonus_due_line) : steps
  // BK 2026-09-29 11:38: if the theme's own steps already say "Mr. Kelley reads
  // these." (September does), use the short line so it isn't said twice.
  const saysIt = shown.some(s => /Mr\. Kelley reads these/.test(s))
  return {
    steps: shown,
    hawkLine: (saysIt && office?.past_bonus_line_short) || office?.past_bonus_line || null,
  }
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
const STEPS = [
  { n: 1, key: 'lesson', label: 'Lesson' },
  { n: 2, key: 'practice', label: 'Practice set' },
  { n: 3, key: 'mystery', label: 'Mystery deep dive' },
  { n: 4, key: 'bonus', label: 'Bonus' },
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
  // Step n is open when every step before it is done. The lesson is always open.
  const isDone = n => done.includes(n)
  const isOpenStep = n => n === 1 || [...Array(n - 1)].every((_, i) => isDone(i + 1))
  const firstOpen = STEPS.find(s => isOpenStep(s.n) && !isDone(s.n))?.n || 4
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
                    <span className="stop-mark" aria-hidden="true">{d ? '✓' : open ? s.n : '🔒'}</span>
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
              {step === 3 && <OfficeSet set={pack.mystery} McItem={McItem} done={isDone(3)} onFinish={() => finish(3)} next="the bonus" titled />}
              {step === 4 && <Finish office={office} theme={theme} bonus={pack.bonus} coaching={pack.coaching} proof={pack.proof_questions} />}
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
  const f = office.finish || {}
  const question = useMemo(() => pickProof(proof), [proof])
  const subject = (f.subject_pattern || '{theme} complete').replace('{theme}', theme.title)
  // The email, line by line, exactly as ruled: {theme} is the title; {proof} is the
  // question picked above. A line whose filling is missing is left out, never faked.
  const body = (f.email_lines || [])
    .filter(l => !l.includes('{proof}') || question)
    .map(l => l.replace('{theme}', theme.title).replace('{proof}', question || ''))
    .join('\n')
  const [copied, setCopied] = useState('')
  const copy = async (what, text) => setCopied((await copyText(text)) ? what : 'fail')
  const { steps, hawkLine } = bonusView(office, theme, bonus)
  return (
    <section className="office-panel finish">
      <h2 className="panel-h">Bonus</h2>
      {bonus?.title && <T as="h3" className="lesson-h">{bonus.title}</T>}
      {hawkLine && <p className="hawk-bonus-line"><span className="hawk-bonus-mark" aria-hidden="true" />{hawkLine}</p>}
      <ol className="bonus-steps">
        {steps.map((s, i) => <T as="li" key={i}>{s}</T>)}
      </ol>

      <div className="email-card" aria-labelledby="email-h">
        <h3 id="email-h" className="email-h">Your email</h3>
        {/* Ruling 5 of the order: never BK's address, never the district domain. */}
        {f.screen_line && <p className="send-line">{f.screen_line}</p>}
        <div className="email-field">
          <span className="email-label">Subject</span>
          <code className="email-value">{subject}</code>
          <button type="button" className="btn-ghost" onClick={() => copy('subject', subject)}>Copy subject</button>
        </div>
        <div className="email-field">
          <span className="email-label">Message</span>
          <pre className="email-value email-body">{body}</pre>
          <button type="button" className="btn-ghost" onClick={() => copy('message', body)}>Copy message</button>
        </div>
        <p className="copy-status" role="status" aria-live="polite">
          {copied === 'subject' && 'Subject copied.'}
          {copied === 'message' && 'Message copied.'}
          {copied === 'fail' && 'Copy did not work here. Select the text and copy it yourself.'}
        </p>
      </div>
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

.office-path{list-style:none;display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:0;margin:0 0 20px;scroll-margin-top:12px}
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

/* The Hawk pass line: a gold-edged note with a diamond mark (shape, not colour alone). */
.hawk-bonus-line{display:flex;align-items:center;gap:10px;margin:4px 0 12px;padding:10px 14px;border-left:4px solid var(--gold);
  background:color-mix(in srgb,var(--gold) 10%,transparent);border-radius:6px;color:var(--white);font-size:16.5px;font-weight:600;line-height:1.45}
.hawk-bonus-mark{flex:none;width:10px;height:10px;background:var(--gold);transform:rotate(45deg)}

.bonus-steps{color:var(--white);font-size:16.5px;line-height:1.6;padding-left:22px;margin:8px 0 18px}
.bonus-steps li{margin-bottom:6px}
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
