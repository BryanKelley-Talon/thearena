// ============================================================
// THE ARENA — v2 shell  (thearena.flashpointhistory.com)
//
// MANIFEST-DRIVEN. The shell renders whatever `public/arena.manifest.json`
// describes. Adding a station, a unit room or an activity is an edit to that
// file — not a rebuild of the Arena. Nothing already live is touched when
// something new is published. (SPEC-arena-ia-and-manifest.md, signed 2026-09-10.)
//
// WHAT CHANGED FROM v1.1 (refactor authorized 2026-09-10, built 2026-09-18):
//   • The hard-coded 12-station STATIONS array is GONE. Station and unit content
//     belongs to the authoring desks and arrives by reference.
//   • Roman numerals are GONE (ruling 3, 2026-08-31).
//   • TR is GONE — retired from the Arena entirely (ruling 8, 2026-09-10).
//     The guide is BK, on both doors, as a DATA SLOT. Never hardcoded here.
//   • Two doors, three lanes each: stations · units · regents (ruling A).
//   • `status: building` renders darkened, non-clickable, out of the tab order,
//     and carries a WORD — dimming alone would carry meaning by colour alone
//     (§7.5 rider, ruling F).
//   • Feel Floor applied (ratified 2026-08-31, unapplied until now).
//   • Six activity types. `map` takes an arbitrary raster with author-defined
//     hit regions — never a modern-country SVG (BK, 2026-09-18). `stimulus`
//     added the same day.
//
// LAWS THIS FILE KEEPS:
//   • Zero student data. No accounts. No saved progress that anything depends on.
//   • localStorage is a convenience and never a dependency — a wiped device
//     lands on a full Arena.
//   • The shell never absorbs content. It points at it.
// ============================================================

import { useState, useEffect, useMemo } from 'react'

const HOME_URL = 'https://flashpointhistory.com'
const MANIFEST_URL = '/arena.manifest.json'
// The SAME list the landing page reads. Canonical copy at builds/_shared/games.json,
// synced into both sites by builds/_shared/sync-games.sh. A scenario_link points at a
// game ID, never a raw URL — so when a game moves (1914 is still off-domain), one edit
// fixes every link on every surface. Two hand-kept lists drift, and a dead link in
// front of a kid is worse than no link. — Josh, 2026-09-18
const GAMES_URL = '/games.json'

// Activity types the shell supports. Adding one is a build on this desk.
const ACTIVITY_TYPES = {
  timeline:      { label: 'Timeline',   blurb: 'Put the moments in order and say what changed.' },
  map:           { label: 'Map',        blurb: 'Reason against the map the source actually shows.' },
  matching:      { label: 'Matching',   blurb: 'Pair them up, then defend one pairing.' },
  board:         { label: 'Board',      blurb: 'The whole-room game. One question, many answers.' },
  scenario_link: { label: 'Scenario',   blurb: 'Step into a decision that really happened.' },
  stimulus:      { label: 'Stimulus',   blurb: 'One source, one question. Commit, then see why.' },
}


// A chart is a standing Regents stimulus, not an edge case — Geography is in the
// course title. Will asked for `kind: "table"` with structured rows; it is cheap,
// so the answer is yes. AND pipe-delimited `content` is parsed automatically, so
// his four items render correctly TODAY without him reshaping anything.
// A wall of pipes in a prose box is worse on a phone than on paper.
function parsePipeTable(text) {
  const lines = String(text || '').split('\n').map(l => l.trim()).filter(Boolean)
  const piped = lines.filter(l => l.includes('|'))
  if (piped.length < 2) return null
  const caption = lines[0].includes('|') ? null : lines[0]
  const rows = piped.map(l => l.split('|').map(c => c.trim()))
  const width = rows[0].length
  if (!rows.every(r => r.length === width)) return null
  return { caption, head: rows[0], body: rows.slice(1) }
}

function DataTable({ table, caption }) {
  if (!table) return null
  return (
    <div className="tbl-wrap">
      {(caption || table.caption) && <div className="tbl-cap">{caption || table.caption}</div>}
      <table className="tbl">
        <thead><tr>{table.head.map((h, i) => <th key={i} scope="col">{h}</th>)}</tr></thead>
        <tbody>
          {table.body.map((r, i) => (
            <tr key={i}>{r.map((c, j) => j === 0
              ? <th key={j} scope="row">{c}</th>
              : <td key={j}>{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}



// ── GUIDE KEYS SURVIVE THE RENAME ──────────────────────────────────────────
// Sam's 69 guide lines are keyed by the OLD station slugs — contextualization,
// sourcing-hipp, opvl, argument-development. The six-card restructure renamed the
// cards to the skill lines and pushed the old stations down into `drills`, so
// NOTHING matched: zero of 69 lines would have fired, silently, with no error.
// The key is a property of the DRILL, not the card, and the drill's content_ref
// still carries it: content/station-06-opvl.json -> "opvl". Derived rather than
// re-keyed, so Sam's file needs no edit and a later re-key still wins.
function drillGuideKey(drill) {
  const ref = drill?.content_ref
  if (!ref) return null
  const stem = String(ref).split('/').pop().replace(/\.json$/i, '')
  return stem.replace(/^station-\d+-/, '') || null
}

// VOCABULARY HOLD — LIFTED 2026-09-18 on BK's approval of three exact deletions.
// Held earlier because the retired words survived inside the rep packages after the
// card rename: station-06's prompt said "using OPVL (Origin, Purpose, Value,
// Limitation)" and both compare lines opened with "Drill OPVL depth" / "Drill HIPP
// sourcing". BK approved removing the ACRONYMS ONLY — the plain words Sam wrote were
// already in the text and are untouched, so nothing was re-authored by this desk.
// Swept after editing: no acronym remains in any rendered field of either package.
// (`station.name` still reads "OPVL" / "Sourcing — HIPP"; it is the package's own
// engineering identity, is never rendered, and was NOT in the three BK approved.)
// The set stays, empty, because the next rename will want it.
const VOCAB_HELD = new Set([])

// Two of Sam's `opvl` guide lines still say the word out loud — station_enter[2] and
// station_complete[1]. Those are guide COPY, not rep content, and were not in BK's
// three. Held at the guide level only: the drill plays, the guide is silent on it.
const GUIDE_HELD = new Set(['opvl'])

// ── SKILL LINES — the crosswalk between a grade and a place to practise ─────
// A student reads a line on their scoring page and must find that same word in
// here. Three things were in the way on 2026-09-18:
//   1. Sam's items write skill_line as a CODE ("EX"); Will's write it as a LABEL
//      ("Historical Context"). Same field name, two kinds of value — grouping on
//      it would have silently matched nothing across desks.
//   2. Will's stations declared no line at all.
//   3. The sixth line DIFFERS by course — US11R ends in Civic Principle (the
//      Civic Literacy Essay), Global in Enduring Issue (the Enduring Issues
//      Essay). They are not interchangeable and nothing may assume six identical
//      lines across courses.
// So: the course declares its own lines, and everything else is normalised to a
// code against that list. An unknown value is returned as-is rather than dropped
// — a line we cannot resolve should be visible, not silently missing.
function courseLines(course) { return course?.skill_lines?.lines || [] }

function lineCode(course, value) {
  if (!value) return null
  const v = String(value).trim()
  const lines = courseLines(course)
  const byCode = lines.find(l => l.code.toLowerCase() === v.toLowerCase())
  if (byCode) return byCode.code
  const byLabel = lines.find(l => l.label.toLowerCase() === v.toLowerCase())
  return byLabel ? byLabel.code : v
}

function lineLabel(course, value) {
  const code = lineCode(course, value)
  const hit = courseLines(course).find(l => l.code === code)
  return hit ? hit.label : (code || null)
}

// The chip a student scans for. On a card whose NAME is already the line, it
// would just repeat itself — so it is suppressed there.
function LineChips({ course, codes, cardName }) {
  const labels = (codes || []).map(c => lineLabel(course, c)).filter(Boolean)
  const shown = labels.filter(l => l.toLowerCase() !== String(cardName || '').toLowerCase())
  if (!shown.length) return null
  return (
    <div className="line-chips">
      {shown.map(l => <span className="line-chip" key={l}>{l}</span>)}
    </div>
  )
}

// ── THE GUIDE ───────────────────────────────────────────────────────────────
// Sam asked (2026-09-18) that four of the nine slots be KEYED BY STATION, because
// a station_enter line serving Contextualization AND OPVL AND Argument Development
// can only say things true of all three — and those sentences are study-skills
// wallpaper. He is right, and he authored against it. Adopted:
//   keyed   — station_enter · attempt_strong · attempt_miss · station_complete
//   unkeyed — door_enter · lane_enter · attempt_again · idle_nudge · signoff
// A keyed slot falls back to its `_default` array, then renders nothing. Nothing
// ever renders empty, and the six stations dark until 11.2/11.3 can stay unwritten.
// NO LINE MAY ASSUME MEMORY. There is no saved state — no "welcome back", no
// "last time you". It is the easiest mistake to make in a coaching voice.
function guideLine(guide, slot, stationSlug) {
  const bank = guide?.lines?.[slot]
  if (!bank) return null
  const arr = Array.isArray(bank)
    ? bank
    : (stationSlug && bank[stationSlug]) || bank._default || null
  if (!Array.isArray(arr) || !arr.length) return null
  return arr[Math.floor(Math.random() * arr.length)]   // rotates; nothing remembered
}

function GuideSays({ guide, slot, stationSlug }) {
  if (stationSlug && GUIDE_HELD.has(stationSlug)) return null
  const line = guideLine(guide, slot, stationSlug)
  if (!line) return null
  return (
    <div className="guide-says">
      {guide.portrait && <img className="guide-face" src={`/${guide.portrait}`} alt="" />}
      <p>{line}</p>
    </div>
  )
}


// ============================================================
// STATION REPS — the compare mechanic.
// attempt → (min real effort) → exemplar → compare on ONE move.
// Coach, never ghostwriter: the model does not appear before a real attempt.
// Nothing is scored, nothing is stored, nothing is sent anywhere.
// ============================================================
function StimulusDoc({ doc, accent, i }) {
  // An image_ref that does not resolve renders as a LABELLED placeholder carrying
  // the citation and the alt text — never a broken image, never a silently absent
  // source. The 29 crops sit in _content-quarantine/ until each clears its gates
  // individually; this is what a student sees until then.
  const [broken, setBroken] = useState(false)
  const hasText = !!doc.content
  return (
    <figure className="stimulus" style={{ borderColor: `${accent}44` }}>
      <div className="doc-tag">Document {i + 1}</div>
      {doc.image_ref && !broken && (
        <img src={`/content/${doc.image_ref}`} alt={doc.image_alt || ''} loading="lazy"
             onError={() => setBroken(true)} />
      )}
      {/* Only shout when the image IS the document. If the rep carries a full
          transcription, the student has the source — a "not cleared" banner over
          a document that is right there reads as broken rather than honest.
          Text present: one quiet line. Text absent: the full notice. */}
      {doc.image_ref && broken && (hasText
        ? <div className="doc-scan-note">Scan not shown — the transcription is the document.</div>
        : <div className="doc-held">
            <b>Source image not cleared yet</b>
            {doc.image_alt && <span>{doc.image_alt}</span>}
            <span>Nothing to read here yet is the honest answer.</span>
          </div>)}
      {hasText && (
        <details className="stimulus-text" open>
          <summary>The document</summary>
          <p>{doc.content}</p>
        </details>
      )}
      {doc.citation && <figcaption>{doc.citation}</figcaption>}
    </figure>
  )
}

function Rep({ rep, station, course, attemptsAllowed }) {
  const [text, setText] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [checked, setChecked] = useState({})
  const MIN = 40
  const ready = text.trim().length >= MIN
  const docs = Array.isArray(rep.stimulus) ? rep.stimulus : []
  const list = rep.compare_checklist || []
  const focus = rep.compare_focus || rep.station_focus

  return (
    <div className="rep">
      {rep.exam_meta && (
        <div className="rep-meta">
          {[rep.exam_meta.exam, rep.exam_meta.administration, rep.exam_meta.part,
            rep.exam_meta.question_ref && `Q${rep.exam_meta.question_ref}`]
            .filter(Boolean).join('  ·  ')}
        </div>
      )}
      {docs.map((d, i) => <StimulusDoc key={i} doc={d} accent={course.accent} i={i} />)}
      {rep.prompt && <div className="rep-prompt">{rep.prompt}</div>}

      <label className="rep-label" htmlFor={`a-${station.slug}-${rep.rep}`}>Your attempt</label>
      <textarea id={`a-${station.slug}-${rep.rep}`} className="rep-box" rows={7} value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Write it the way you would on the exam. Nothing here is saved or scored." />

      {!revealed ? (
        <>
          <button className="rep-go" disabled={!ready} onClick={() => setRevealed(true)}>
            {ready ? 'Show me a strong answer' : `Write a bit more first — ${Math.max(0, MIN - text.trim().length)} characters to go`}
          </button>
          {/* The gate is the mechanic, not friction. Say why. */}
          <p className="rep-why">The model stays shut until you have written something real.
             Comparing your own attempt is the part that teaches; reading a good answer cold is not.</p>
        </>
      ) : (
        <div className="rep-reveal">
          {/* NOT attempt_miss, and not attempt_strong. The attempt is free text and
              this shell cannot judge free text — firing either slot would tell a
              student they missed, or nailed it, on no evidence. A kid who wrote a
              strong answer must never be told "close, look again." `attempt_again`
              is the only neutral slot, and if it is absent the compare focus below
              does the work on its own. Flagged to Sam 2026-09-18: two of his nine
              slots cannot fire on a free-text station rep. */}
          <GuideSays guide={course.guide} slot="attempt_again" stationSlug={station.slug} />
          <h4>A strong answer</h4>
          <p className="rep-exemplar">{rep.exemplar}</p>
          {focus && (
            <div className="rep-focus"><b>Compare on this one thing:</b> {focus}</div>
          )}
          {!!list.length && (
            <>
              <h4>Check your own</h4>
              <ul className="rep-check">
                {list.map((item, i) => (
                  <li key={i}>
                    <label>
                      <input type="checkbox" checked={!!checked[i]}
                             onChange={() => setChecked(c => ({ ...c, [i]: !c[i] }))} />
                      <span>{item}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <p className="rep-why">You are the one marking these. Nothing is recorded, and nobody
                 sees it — the checklist is a way of reading your own work, not a score.</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── helpers ────────────────────────────────────────────────────────────────
const isOpen = (o) => (o?.status ?? 'open') !== 'building'
const isLive = (o) => o?.published === true && isOpen(o)

// A thing is enterable only if it is published, open, AND its content resolves.
const resolves = (ref) => typeof ref === 'string' && ref.length > 0

// ============================================================
// FEEL FLOOR + COMPONENT STYLES
// Reduced motion gets its own feedback language, not a worse one.
// ============================================================
const STYLES = `
/* Palette comes from tokens/arena-navy.css. Nothing here hardcodes a colour
   the token file does not own — swap the token file, the Arena re-skins. */
:root{
  --gold:var(--arena-gold); --gold-lit:var(--arena-gold-lit);
  --canvas:var(--arena-canvas); --white:var(--arena-white);
  --grey:var(--arena-grey); --dim:var(--arena-grey-dim);
  --card:var(--arena-card); --card-lit:var(--arena-card-lit); --edge:var(--arena-edge);
  --ease-settle:cubic-bezier(.18,.89,.32,1.28);
  --ease-calm:cubic-bezier(.2,.7,.3,1);
}
.wrap{max-width:1040px;margin:0 auto;padding:28px 20px 72px}
.arena-type{font-family:'Barlow Condensed','Outfit',system-ui,sans-serif}

/* FEEL FLOOR: every interactive surface answers under 100ms. */
button,[role=button],a.door,.card{transition:transform .14s var(--ease-settle),
  background-color .12s var(--ease-calm),border-color .12s var(--ease-calm),
  box-shadow .14s var(--ease-calm);}
button:active:not(:disabled),a.door:active{transform:scale(.985)}
:focus-visible{outline:3px solid var(--gold-lit);outline-offset:3px;border-radius:6px}

/* ---------- SPLASH ---------- */
.splash{text-align:center;padding-top:34px;position:relative}
/* The Arena's own front door. A fictional building — chrome, not a Realness
   asset. The scrim is what guarantees the type keeps its contrast over it. */
.hero{position:absolute;inset:-28px -20px auto;height:760px;z-index:0;overflow:hidden}
.hero img{width:100%;height:100%;object-fit:cover;object-position:center 34%;display:block}
.hero::after{content:'';position:absolute;inset:0;background:
  linear-gradient(180deg,
    color-mix(in srgb,var(--canvas) 62%,transparent) 0%,
    color-mix(in srgb,var(--canvas) 80%,transparent) 34%,
    color-mix(in srgb,var(--canvas) 96%,transparent) 62%,
    var(--canvas) 88%)}
.splash > *:not(.hero){position:relative;z-index:1}
.splash-mark{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;
  letter-spacing:.34em;font-size:13px;color:var(--gold);margin-bottom:10px;
  text-shadow:0 1px 10px var(--canvas)}
.splash h1{font-family:'Barlow Condensed',sans-serif;font-size:clamp(46px,9vw,78px);
  line-height:.94;letter-spacing:-.01em;text-transform:uppercase;color:var(--white);margin-bottom:6px;
  text-shadow:0 2px 24px var(--canvas)}
.splash-tag{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;
  letter-spacing:.22em;font-size:13.5px;color:var(--gold);margin-bottom:22px;
  text-shadow:0 1px 10px var(--canvas)}
.rule{width:64px;height:2px;background:var(--gold);margin:0 auto 22px;border-radius:1px}
.splash-intro{max-width:600px;margin:0 auto 10px;text-align:left}
.splash-intro p{color:var(--white);font-size:16px;line-height:1.66;margin-bottom:15px}
.splash-intro p.lede{font-family:'Barlow Condensed',sans-serif;font-size:27px;line-height:1.16;
  text-transform:uppercase;letter-spacing:.01em;color:var(--gold);margin-bottom:14px;text-align:center}
.placeholder{max-width:620px;margin:0 auto 12px;padding:14px 16px;text-align:left;
  border:1px dashed var(--edge);border-radius:10px;
  background:color-mix(in srgb,var(--card) 88%,transparent);
  color:var(--grey);font-size:14.5px;line-height:1.55;backdrop-filter:blur(3px)}
.placeholder b{color:var(--gold-lit);display:block;margin-bottom:3px;
  font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.09em;font-size:12.5px}
.epigraph{max-width:620px;margin:0 auto 30px;padding:0 0 0 16px;border-left:2px solid var(--gold);text-align:left}
.epigraph p{color:var(--grey);font-style:italic;font-size:15px;line-height:1.6;margin-bottom:7px}
.epigraph cite{color:var(--grey);font-style:normal;font-size:12.5px;opacity:.85;display:block}

/* ---------- THE GUIDE ---------- */
.guide-says{display:flex;gap:13px;align-items:flex-start;margin:0 0 22px;padding:14px 16px;
  border-radius:12px;background:var(--card);border:1px solid var(--edge);
  border-left:3px solid var(--gold);max-width:660px}
.guide-says p{color:var(--white);font-size:15.5px;line-height:1.58;margin:0}
.guide-face{width:46px;height:46px;border-radius:50%;flex:none;object-fit:cover;
  border:2px solid var(--gold)}
.guide-face.lg{width:92px;height:92px;border-width:3px;margin:0 auto 20px;display:block}

/* ---------- DOORS ---------- */
.doors{display:grid;grid-template-columns:repeat(auto-fit,minmax(272px,1fr));gap:18px;
  max-width:820px;margin:36px auto 0}
a.door,div.door{display:block;text-align:left;text-decoration:none;padding:24px 22px 22px;
  border-radius:14px;background:color-mix(in srgb,var(--card) 92%,transparent);
  border:1px solid var(--edge);position:relative;backdrop-filter:blur(4px)}
a.door{cursor:pointer}
a.door:hover{background:var(--card-lit);border-color:var(--gold);transform:translateY(-3px);
  box-shadow:0 10px 30px -12px #0006}
.door-accent{height:4px;border-radius:2px;width:46px;margin-bottom:14px}
.door-label{font-family:'Barlow Condensed',sans-serif;font-size:27px;line-height:1.08;
  text-transform:uppercase;color:var(--white);margin-bottom:8px}
.door-blurb{color:var(--grey);font-size:14.5px;line-height:1.5}
.door.building{opacity:.46;cursor:default}
.door.building .door-label{color:var(--dim)}
/* Meaning is never carried by dimming alone — the word is the signal. */
.flag{display:inline-block;margin-top:13px;padding:4px 9px;border-radius:5px;
  font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.11em;
  font-size:11.5px;font-weight:600;border:1px solid}
/* Three states, three WORDS. Colour is the second signal, never the first. */
.flag.building{color:var(--gold-lit);border-color:#7A5F20;background:#2A2312}
.flag.soon{color:var(--grey);border-color:#3B4B62;background:#16202F}
.flag.live{color:var(--canvas);border-color:var(--gold);background:var(--gold);font-weight:700}

/* ---------- HEADER ---------- */
.screen-header{display:flex;align-items:center;gap:16px;padding:12px 0 14px;margin-bottom:22px}
.back-btn{background:none;border:none;color:var(--grey);font-size:14.5px;cursor:pointer;
  font-family:'Outfit',sans-serif;padding:6px 10px 6px 0}
.back-btn:hover{color:var(--white)}
.screen-header-title{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;
  letter-spacing:.13em;font-size:15px;margin-left:auto}

/* ---------- LANES ---------- */
.lane-nav{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:24px}
.lane-tab{background:var(--card);border:1px solid var(--edge);color:var(--grey);padding:9px 16px;
  border-radius:9px;cursor:pointer;font-family:'Barlow Condensed',sans-serif;
  text-transform:uppercase;letter-spacing:.1em;font-size:13.5px}
.lane-tab:hover{color:var(--white);background:var(--card-lit);border-color:var(--gold)}
.lane-tab[aria-selected=true]{color:var(--canvas);font-weight:700}
.lane-tab:disabled{opacity:.42;cursor:default}
.lane-intro{color:var(--grey);font-size:15px;line-height:1.6;margin-bottom:20px;max-width:640px}

/* ---------- CARDS ---------- */
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(232px,1fr));gap:14px}
.card{text-align:left;width:100%;padding:18px 17px;border-radius:12px;background:var(--card);
  border:1px solid var(--edge);color:inherit;font-family:'Outfit',sans-serif;cursor:pointer}
.card:hover:not(.card.off){background:var(--card-lit);border-color:var(--gold);transform:translateY(-2px)}
.card.off{opacity:.45;cursor:default}
.card-name{font-family:'Barlow Condensed',sans-serif;font-size:20.5px;line-height:1.14;
  text-transform:uppercase;color:var(--white);margin-bottom:7px}
.card.off .card-name{color:var(--dim)}
.card-blurb{color:var(--grey);font-size:13.5px;line-height:1.48}
.card-type{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;
  letter-spacing:.13em;font-size:11px;color:var(--gold);margin-bottom:7px}

/* ---------- EMPTY / NOT WIRED ---------- */
.empty{border:1px dashed var(--edge);border-radius:12px;padding:30px 24px;text-align:center;
  color:var(--grey);max-width:620px}
.empty-title{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;
  letter-spacing:.11em;font-size:16px;color:var(--white);margin-bottom:9px}
.empty p{font-size:14.5px;line-height:1.6;margin-bottom:8px}
.detail{max-width:680px}
.detail h2{font-family:'Barlow Condensed',sans-serif;font-size:34px;text-transform:uppercase;
  line-height:1.08;color:var(--white);margin-bottom:10px}
.detail .sub{color:var(--grey);font-size:16px;line-height:1.55;margin-bottom:22px}
code{font-family:ui-monospace,Menlo,monospace;font-size:.9em;color:var(--gold-lit);
  background:var(--card-lit);padding:1px 5px;border-radius:4px}
.loading{padding:80px 20px;text-align:center;color:var(--grey);font-size:15px}

/* ---------- SKILL-LINE CHIPS ---------- */
/* The word a student was graded on, on the card they practise it in. */
.line-chips{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 8px}
.line-chip{display:inline-block;padding:3px 9px;border-radius:5px;
  background:color-mix(in srgb,var(--gold) 14%,transparent);
  border:1px solid color-mix(in srgb,var(--gold) 45%,transparent);
  color:var(--gold-lit);font-family:'Barlow Condensed',sans-serif;
  text-transform:uppercase;letter-spacing:.1em;font-size:11px;font-weight:600}
.mc-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px}
.mc-head .mc-count{margin-bottom:0}

/* ---------- PAIRED DOCUMENTS ---------- */
.doc-pair{margin-bottom:16px}
.pair-cap{color:var(--gold);font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;
  letter-spacing:.11em;font-size:11.5px;margin-bottom:10px}
.pair-item{margin-bottom:10px}
.pair-item .doc-tag{margin-bottom:6px}
.pair-item .stimulus{margin-bottom:0}

/* ---------- DATA TABLE STIMULUS ---------- */
.tbl-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;margin-bottom:9px}
.tbl-cap{color:var(--gold);font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;
  letter-spacing:.11em;font-size:11.5px;margin-bottom:9px}
.tbl{border-collapse:collapse;width:100%;min-width:520px;font-size:13.5px}
.tbl th,.tbl td{border:1px solid var(--edge);padding:8px 10px;text-align:left;vertical-align:top;
  line-height:1.45}
.tbl thead th{background:var(--card-lit);color:var(--gold);font-family:'Barlow Condensed',sans-serif;
  text-transform:uppercase;letter-spacing:.08em;font-size:11.5px;font-weight:600;white-space:nowrap}
.tbl tbody th{color:var(--white);font-weight:600;background:color-mix(in srgb,var(--card-lit) 55%,transparent)}
.tbl tbody td{color:var(--grey)}
.set-heading{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.12em;
  font-size:12.5px;color:var(--gold);margin:26px 0 10px;padding-top:18px;border-top:1px solid var(--edge)}

/* ---------- STATION REPS ---------- */
.rep{border:1px solid var(--edge);border-radius:12px;padding:20px 18px;margin-bottom:20px;background:var(--card)}
.rep-meta{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.12em;
  font-size:11px;color:var(--gold);margin-bottom:13px}
.doc-tag{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.12em;
  font-size:10.5px;color:var(--grey);margin-bottom:8px}
.doc-held{border:1px dashed var(--edge);border-radius:7px;padding:12px 13px;margin-bottom:9px;
  display:flex;flex-direction:column;gap:5px;background:color-mix(in srgb,var(--canvas) 60%,transparent)}
.doc-scan-note{color:var(--grey);font-size:12px;font-style:italic;margin-bottom:8px;opacity:.85}
.doc-held b{color:var(--gold-lit);font-size:12.5px;font-family:'Barlow Condensed',sans-serif;
  text-transform:uppercase;letter-spacing:.1em}
.doc-held span{color:var(--grey);font-size:13.5px;line-height:1.5}
.rep-prompt{color:var(--white);font-size:15.5px;line-height:1.6;margin:16px 0 18px;
  white-space:pre-wrap;padding-left:13px;border-left:2px solid var(--gold)}
.rep-label{display:block;font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;
  letter-spacing:.12em;font-size:11.5px;color:var(--gold);margin-bottom:7px}
.rep-box{width:100%;padding:12px 13px;border-radius:9px;background:var(--canvas);
  border:1px solid var(--edge);color:var(--white);font-family:'Outfit',sans-serif;
  font-size:15px;line-height:1.6;resize:vertical}
.rep-box:focus{outline:none;border-color:var(--gold)}
.rep-go{margin-top:12px;padding:11px 18px;border-radius:9px;border:1px solid var(--gold);
  background:var(--gold);color:var(--canvas);font-family:'Barlow Condensed',sans-serif;
  text-transform:uppercase;letter-spacing:.1em;font-size:14px;font-weight:700;cursor:pointer}
.rep-go:disabled{background:transparent;color:var(--grey);border-color:var(--edge);cursor:default;
  letter-spacing:.04em;text-transform:none;font-family:'Outfit',sans-serif;font-weight:400;font-size:13.5px}
.rep-why{color:var(--grey);font-size:13px;line-height:1.55;margin-top:10px}
.rep-reveal{margin-top:20px;padding-top:18px;border-top:1px solid var(--edge)}
.rep-reveal h4{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;
  letter-spacing:.12em;font-size:12.5px;color:var(--gold);margin:16px 0 8px}
.rep-exemplar{color:var(--white);font-size:15px;line-height:1.68;white-space:pre-wrap;
  padding:13px 14px;border-radius:9px;background:var(--canvas);border:1px solid var(--edge)}
.rep-focus{margin-top:14px;padding:11px 13px;border-radius:9px;border-left:3px solid var(--gold);
  background:color-mix(in srgb,var(--gold) 9%,transparent);color:var(--white);
  font-size:14.5px;line-height:1.55}
.rep-check{list-style:none;padding:0;margin:0}
.rep-check li{margin-bottom:9px}
.rep-check label{display:flex;gap:10px;align-items:flex-start;cursor:pointer;
  color:var(--white);font-size:14.5px;line-height:1.5}
.rep-check input{margin-top:3px;width:17px;height:17px;accent-color:var(--gold);flex:none;cursor:pointer}

/* ---------- STIMULUS / MC ---------- */
.mc-preamble{color:var(--grey);font-size:14.5px;line-height:1.6;margin-bottom:22px}
.mc-item{border:1px solid var(--edge);border-radius:12px;padding:20px 18px;margin-bottom:18px;
  background:var(--card)}
.mc-count{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;
  letter-spacing:.14em;font-size:11px;color:var(--gold);margin-bottom:10px}
.stimulus{margin:0 0 16px;border:1px solid;border-radius:9px;padding:12px;background:var(--canvas)}
.stimulus img{width:100%;border-radius:5px;display:block;margin-bottom:9px}
.stimulus-text summary{cursor:pointer;font-family:'Barlow Condensed',sans-serif;
  text-transform:uppercase;letter-spacing:.11em;font-size:11.5px;color:var(--gold);margin-bottom:7px}
.stimulus-text p{color:var(--white);font-size:14.5px;line-height:1.66;white-space:pre-wrap}
.stimulus figcaption{color:var(--grey);font-size:12.5px;font-style:italic;margin-top:9px}
.mc-q{color:var(--white);font-size:16.5px;line-height:1.5;margin-bottom:13px;font-weight:500}
.mc-choices{display:flex;flex-direction:column;gap:8px}
.mc-choice{display:flex;gap:9px;align-items:flex-start;text-align:left;width:100%;
  padding:11px 13px;border-radius:9px;background:var(--card-lit);border:1px solid var(--edge);
  color:var(--white);font-family:'Outfit',sans-serif;font-size:14.5px;line-height:1.45;cursor:pointer}
.mc-choice:hover:not(:disabled){border-color:var(--gold)}
.mc-choice b{color:var(--gold);flex:none}
.mc-choice:disabled{cursor:default}
/* Right and wrong are carried by a WORD first; colour is the second signal. */
.mc-choice.correct{border-color:#3E8F63;background:#14261C}
.mc-choice.incorrect{border-color:#9C4B43;background:#261615}
.mc-choice.dim{opacity:.5}
.mc-mark{margin-left:auto;padding-left:10px;font-style:normal;flex:none;
  font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.1em;
  font-size:11px;font-weight:700}
.mc-choice.correct .mc-mark{color:#7FCFA0}
.mc-choice.incorrect .mc-mark{color:#E08C82}
.mc-reveal{margin-top:14px;padding-top:13px;border-top:1px solid var(--edge)}
.mc-reveal p{font-size:14.5px;line-height:1.6;margin-bottom:9px;color:var(--grey)}
.mc-reveal b{color:var(--white)}
.mc-reasoning{color:var(--white) !important}

/* Session counters. Not a score — no percentage, no rubric, no total possible. */
.counters{display:flex;gap:10px;flex-wrap:wrap;margin-top:6px;padding-top:16px;
  border-top:1px solid var(--edge)}
.counter{padding:7px 13px;border-radius:8px;background:var(--card);border:1px solid var(--edge);
  color:var(--grey);font-size:13.5px}
.counter b{color:var(--gold);font-size:16px;font-family:'Barlow Condensed',sans-serif;
  margin-right:3px}

/* REDUCED MOTION — its own feedback language, not a stripped one.
   Motion cues are replaced by a persistent border-weight + inset shade. */
@media (prefers-reduced-motion:reduce){
  button,[role=button],a.door,.card{transition:background-color .01ms,border-color .01ms}
  a.door:hover,.card:hover:not(.card.off){transform:none;border-color:var(--gold);
    box-shadow:inset 0 0 0 1px var(--gold)}
  button:active:not(:disabled),a.door:active{transform:none;box-shadow:inset 0 0 0 2px var(--gold-lit)}
  .hero img{filter:saturate(.85)}
}
@media (max-width:560px){
  .wrap{padding:20px 16px 56px}
  .doors{grid-template-columns:1fr}
  .grid{grid-template-columns:1fr}
}
`

// ============================================================
// SPLASH — two doors. BK introduces the Arena himself (ruling E).
// ============================================================
function Splash({ manifest, onPick }) {
  const { splash = {}, courses = [] } = manifest
  // The guide meets a student here first, then again inside. Same face either way.
  const guidePortrait = (courses.find(c => c.guide?.portrait) || {}).guide?.portrait || null
  return (
    <div className="wrap splash">
      <div className="hero" aria-hidden="true">
        <img src="/images/arena/frontdoor-bg.jpg" alt="" />
      </div>
      <div className="splash-mark">Flashpoint History</div>
      <h1>The Arena</h1>
      <div className="splash-tag">Train here. Perform anywhere.</div>
      <div className="rule" />

      {/* The epigraph is a QUOTATION: verbatim, attributed, dated, cited, and its
          citation is always visible — never a tooltip. The source was filed to the
          bank before these words were used (canon §6). */}
      {splash.epigraph && (
        <blockquote className="epigraph">
          <p>{splash.epigraph.text}</p>
          <cite>{splash.epigraph.cite}</cite>
        </blockquote>
      )}

      {/* BK's own words. Paragraphs, not one blob — a kid reads paragraphs. */}
      {Array.isArray(splash.intro) && splash.intro.length ? (
        <div className="splash-intro">
          {guidePortrait && <img className="guide-face lg" src={`/${guidePortrait}`} alt="" />}
          {splash.intro.map((para, i) => (
            <p key={i} className={i === 0 ? 'lede' : undefined}>{para}</p>
          ))}
        </div>
      ) : (
        <div className="placeholder">
          <b>Splash intro — awaiting BK</b>
          BK&rsquo;s own words. Not invented here.
        </div>
      )}

      <div className="doors">
        {courses.map(c => {
          const open = isOpen(c)
          const Tag = open ? 'a' : 'div'
          return (
            <Tag
              key={c.id}
              className={`door${open ? '' : ' building'}`}
              {...(open
                ? { href: `#/${c.id}`, onClick: e => { e.preventDefault(); onPick(c.id) } }
                : { 'aria-disabled': 'true' })}
            >
              <div className="door-accent" style={{ background: open ? c.accent : 'var(--dim)' }} />
              <div className="door-label">{c.label}</div>
              {c.blurb && <div className="door-blurb">{c.blurb}</div>}
              <span className={`flag ${open ? 'live' : 'building'}`}>
                {open ? 'Open' : 'Under construction'}
              </span>
            </Tag>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================
// COURSE DOOR — three lanes, peer to each other (ruling B)
// ============================================================
const LANES = [
  { key: 'stations', label: 'Skill Stations', intro: 'One skill at a time. Train the move, not the unit.' },
  { key: 'units',    label: 'Unit Rooms',     intro: 'Everything for one unit, in one place.' },
  { key: 'regents',  label: 'Regents Review', intro: 'The exam itself — its parts, and how to work them.' },
]

function CourseDoor({ course, onOpenStation, onOpenUnit, onBack }) {
  const firstWithContent = LANES.find(l => (course[l.key] || []).length)?.key || 'stations'
  const [lane, setLane] = useState(firstWithContent)

  return (
    <div className="wrap">
      <ScreenHeader label={course.label} onBack={onBack} color={course.accent} back="The Arena" />

      <div className="lane-nav" role="tablist" aria-label="Lanes">
        {LANES.map(l => {
          const count = (course[l.key] || []).length
          const sel = lane === l.key
          return (
            <button
              key={l.key}
              role="tab"
              aria-selected={sel}
              disabled={!count}
              className="lane-tab"
              style={sel ? { background: course.accent, borderColor: course.accent } : undefined}
              onClick={() => setLane(l.key)}
            >
              {l.label}{count ? ` · ${count}` : ''}
            </button>
          )
        })}
      </div>

      <GuideSays guide={course.guide} slot="door_enter" />
      <p className="lane-intro">{LANES.find(l => l.key === lane)?.intro}</p>

      {lane === 'stations' && <StationLane course={course} onOpen={onOpenStation} />}
      {lane === 'units' && <UnitLane course={course} onOpen={onOpenUnit} />}
      {lane === 'regents' && <EmptyLane what="Regents review" />}
    </div>
  )
}

function StationLane({ course, onOpen }) {
  const stations = course.stations || []
  if (!stations.length) return <EmptyLane what="Skill stations" />
  return (
    <div className="grid">
      {stations.map(s => {
        // PUBLISHED governs the card's light, not whether its reps happen to be
        // bound yet. A teacher who published a station published it; dimming it
        // because this desk has not wired the drill misreports their data.
        const live = isLive(s)
        // A card now holds DRILLS. It is enterable if it is published and has at
        // least one published drill — or, for the older one-package shape, a ref.
        const drills = (s.drills || []).filter(d => d.published && !VOCAB_HELD.has(drillGuideKey(d)))
        const wired = drills.length > 0 || resolves(s.content_ref)
        return (
          <button
            key={s.slug}
            className={`card${live ? '' : ' off'}`}
            disabled={!live}
            tabIndex={live ? 0 : -1}
            onClick={() => live && onOpen(s.slug)}
          >
            {/* No numeral (ruling 3). No tier band (ruling 4) — the key stays in the contract. */}
            <div className="card-name">{s.name}</div>
            <LineChips course={course} codes={s.skill_lines} cardName={s.name} />
            {s.blurb && <div className="card-blurb">{s.blurb}</div>}
            {!live
              ? <span className="flag soon">Not yet taught</span>
              : wired
                ? <span className="flag live">{drills.length > 1 ? `${drills.length} ways in` : 'Ready'}</span>
                : <span className="flag building">Reps land soon</span>}
          </button>
        )
      })}
    </div>
  )
}

// ── STATION SCREEN ─────────────────────────────────────────────────────────
// The drill itself is bound BY REFERENCE. Until the owning desk supplies a rep
// package, the station opens and says so plainly rather than pretending.

// A DRILL is what used to be a station: one package of reps, opened from inside
// its skill-line card. The guide speaks here, keyed by the drill's own identity.
function DrillScreen({ course, station, drill, onBack }) {
  const [pkg, setPkg] = useState(null)
  const [missing, setMissing] = useState(false)
  const key = drillGuideKey(drill)

  useEffect(() => {
    setPkg(null); setMissing(false)
    const ref = String(drill.content_ref || '').replace(/^content\//, '')
    if (!ref) { setMissing(true); return }
    fetch(`/content/${ref}`).then(r => { if (!r.ok) throw new Error('404'); return r.json() })
      .then(setPkg).catch(() => setMissing(true))
  }, [drill.content_ref])

  const reps = ((pkg && pkg.reps) || []).filter(r => r.prompt || r.exemplar)
  const items = (pkg && pkg.items) || []

  return (
    <div className="wrap">
      <ScreenHeader label={drill.name} onBack={onBack} color={course.accent} back={station.name} />
      <div className="detail" style={{ maxWidth: 740 }}>
        <h2>{drill.name}</h2>
        <LineChips course={course} codes={drill._skill_lines || station.skill_lines} cardName={drill.name} />
        <GuideSays guide={course.guide} slot="station_enter" stationSlug={key} />
        {missing ? (
          <div className="empty" style={{ textAlign: 'left' }}>
            <div className="empty-title">The reps for this drill are not bound yet</div>
            <p>Its practice reps arrive by reference from the desk that owns this course.</p>
          </div>
        ) : !pkg ? <p className="sub">Loading the reps&hellip;</p>
        : !reps.length && !items.length ? (
          <div className="empty" style={{ textAlign: 'left' }}>
            <div className="empty-title">This package has no reps with work in them yet</div>
          </div>
        ) : (
          <>
            {reps.map((r, i) => (
              <Rep key={r.rep ?? i} rep={r} station={{ ...station, slug: key }} course={course}
                   attemptsAllowed={pkg.attempts ?? 2} />
            ))}
            {!!items.length && <ItemSet pack={pkg} course={course} heading={reps.length ? 'Quick reps' : null} />}
          </>
        )}
      </div>
    </div>
  )
}

function StationScreen({ course, station, onBack, onOpenDrill }) {
  const hasDrills = Array.isArray(station.drills) && station.drills.length > 0
  const drillList = hasDrills ? station.drills : []
  const wired = resolves(station.content_ref)
  const [pkg, setPkg] = useState(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    if (hasDrills || !wired) return
    setPkg(null); setMissing(false)
    const ref = station.content_ref.replace(/^content\//, '')
    fetch(`/content/${ref}`)
      .then(r => { if (!r.ok) throw new Error('404'); return r.json() })
      .then(setPkg).catch(() => setMissing(true))
  }, [station.slug, wired, station.content_ref])

  // An "everyday" rep whose content lived in the old hard-coded shell is a
  // pointer, not a rep. Only render reps that actually carry work.
  const reps = ((pkg && pkg.reps) || []).filter(r => r.prompt || r.exemplar)
  // A STATION CAN HOLD AN ITEM PACK, not only rep packages. Will's argument,
  // 2026-09-18, and it is the right one: a kid who got a 2 on Historical Context
  // needs somewhere to go that is spelled the same as the line he got the 2 on.
  // Item packs are the by-product of every unit either desk builds, so this is the
  // slot that fills itself all year. A package may carry reps, items, or both.
  const items = (pkg && pkg.items) || []

  return (
    <div className="wrap">
      <ScreenHeader label={station.name} onBack={onBack} color={course.accent} back={course.label} />
      <div className="detail" style={{ maxWidth: 740 }}>
        <h2>{station.name}</h2>
        <LineChips course={course} codes={station.skill_lines} cardName={station.name} />
        {station.blurb && <p className="sub">{station.blurb}</p>}
        <GuideSays guide={course.guide} slot="station_enter" stationSlug={station.slug} />

        {/* A card with drills is a menu, not a worksheet. Show the ways in. */}
        {hasDrills ? (
          drillList.length ? (
            <div className="grid" style={{ marginTop: 4 }}>
              {drillList.map((dr, i) => {
                const held = VOCAB_HELD.has(drillGuideKey(dr))
                const on = !!dr.published && !held
                return (
                  <button key={i} className={`card${on ? '' : ' off'}`} disabled={!on}
                          tabIndex={on ? 0 : -1} onClick={() => on && onOpenDrill(i)}>
                    <div className="card-name">{dr.name}</div>
                    {on ? <span className="flag live">Start</span>
                        : held ? <span className="flag building">Being reworded</span>
                        : <span className="flag soon">Opens at {dr.opens_at || 'a later unit'}</span>}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="empty" style={{ textAlign: 'left' }}>
              <div className="empty-title">Nothing open in this line yet</div>
              <p>The drills for this skill are built and waiting on the unit that teaches them.</p>
            </div>
          )
        ) : !wired || missing ? (
          <div className="empty" style={{ textAlign: 'left' }}>
            <div className="empty-title">The reps for this station are not bound yet</div>
            <p>This station is published &mdash; it is a skill this course teaches and a card a
               student should see. Its practice reps arrive by reference from the desk that owns
               this course, as a rep package named in <code>content_ref</code>.</p>
            <p style={{ color: '#7E766A' }}>Nothing to train here yet is the honest answer.</p>
          </div>
        ) : !pkg ? (
          <p className="sub">Loading the reps&hellip;</p>
        ) : !reps.length && !items.length ? (
          <div className="empty" style={{ textAlign: 'left' }}>
            <div className="empty-title">This package has no reps with work in them yet</div>
            <p>The package is bound and the schema is right &mdash; it just has no prompt,
               exemplar or items to train against.</p>
          </div>
        ) : (
          <>
            {reps.map((r, i) => (
              <Rep key={r.rep ?? i} rep={r} station={station} course={course}
                   attemptsAllowed={pkg.attempts ?? 2} />
            ))}
            {!!items.length && (
              <ItemSet pack={pkg} course={course} heading={reps.length ? 'Quick reps' : null} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

function UnitLane({ course, onOpen }) {
  const units = (course.units || [])
  if (!units.length) return <EmptyLane what="Unit rooms" />
  return (
    <div className="grid">
      {units.map(u => {
        const on = isLive(u)
        const n = (u.activities || []).filter(isLive).length
        return (
          <button
            key={u.slug}
            className={`card${on ? '' : ' off'}`}
            disabled={!on}
            tabIndex={on ? 0 : -1}
            onClick={() => on && onOpen(u.slug)}
          >
            <div className="card-name">{u.label}</div>
            <div className="card-blurb">
              {n ? `${n} ${n === 1 ? 'activity' : 'activities'}` : 'Nothing published yet'}
            </div>
            {on
              ? <span className="flag live">Open</span>
              : <span className="flag building">Under construction</span>}
          </button>
        )
      })}
    </div>
  )
}

function UnitRoom({ course, unit, games, packs, onOpenActivity, onBack }) {
  const acts = (unit.activities || []).filter(isLive)
  // Resolve a scenario_link's content_ref against the shared games manifest.
  // A raw https:// ref still works, so nothing already written breaks.
  const gameFor = ref => (games || []).find(g => g.id === ref) || null
  return (
    <div className="wrap">
      <ScreenHeader label={unit.label} onBack={onBack} color={course.accent} back={course.label} />
      {!acts.length
        ? <EmptyLane what="Activities" />
        : <div className="grid">
            {acts.map((a, i) => {
              const t = ACTIVITY_TYPES[a.type]
              const isScenario = a.type === 'scenario_link'
              const game = isScenario ? gameFor(a.content_ref) : null
              const rawUrl = isScenario && /^https?:/.test(a.content_ref || '') ? a.content_ref : null
              const href = game?.status === 'live' ? game.url : rawUrl
              // A scenario_link naming a game that is not live yet is not an error
              // and not a dead link — it is a card that says "not built yet".
              if (isScenario && !href) {
                return (
                  <div className="card off" key={i}>
                    <div className="card-type">{t?.label}</div>
                    <div className="card-name">{game?.title || a.label}</div>
                    <div className="card-blurb">{t?.blurb}</div>
                    <span className="flag soon">Game not built yet</span>
                  </div>
                )
              }
              if (href) {
                return (
                  <a key={i} className="card" href={href} target="_blank" rel="noopener noreferrer">
                    <div className="card-type">{t?.label}</div>
                    <div className="card-name">{a.label}</div>
                    <div className="card-blurb">
                      {game ? `${game.year}: ${game.title}` : t?.blurb}
                    </div>
                    <span className="flag live">Opens the game</span>
                  </a>
                )
              }
              // stimulus is the one mechanic built in v2. Everything else is a
              // card that says so rather than a card that pretends.
              const playable = a.type === 'stimulus'
              return (
                <button key={i} type="button" className={`card${playable ? '' : ' off'}`}
                        disabled={!playable} tabIndex={playable ? 0 : -1}
                        onClick={() => playable && onOpenActivity(i)}>
                  <div className="card-type">{t?.label || a.type}</div>
                  <div className="card-name">{a.label}</div>
                  <div className="card-blurb">{t?.blurb}</div>
                  {playable
                    ? <span className="flag live">Start</span>
                    : <span className="flag soon">Mechanic not built yet</span>}
                </button>
              )
            })}
          </div>}
    </div>
  )
}

function EmptyLane({ what }) {
  return (
    <div className="empty">
      <div className="empty-title">{what} — nothing here yet</div>
      <p>This lane is wired and waiting. It fills from <code>arena.manifest.json</code> the moment
         the desk that owns this course publishes into it — no rebuild, no redeploy.</p>
      <p style={{ color: '#7E766A' }}>Nothing to do here yet is the honest answer.</p>
    </div>
  )
}


// ============================================================
// STIMULUS — one source, one question, commit, then see why.
// The shape of Regents Part I. Stateless: a wiped device loses nothing,
// because nothing was ever kept. No score, no streak, no progress.
// ============================================================
function StimulusFigure({ doc, accent }) {
  if (!doc) return null
  const table = doc.kind === 'table'
    ? (doc.rows ? { caption: doc.caption, head: doc.rows[0], body: doc.rows.slice(1) } : parsePipeTable(doc.content))
    : parsePipeTable(doc.content)
  return (
    <figure className="stimulus" style={{ borderColor: `${accent}44` }}>
      {doc.image_ref && (
        <img src={`/content/${doc.image_ref}`} alt={doc.image_alt || ''} loading="lazy" />
      )}
      {table
        ? <DataTable table={table} caption={doc.caption} />
        : doc.content && (
            <details className="stimulus-text" open>
              <summary>The source</summary>
              <p>{doc.content}</p>
            </details>
          )}
      {doc.citation && <figcaption>{doc.citation}</figcaption>}
    </figure>
  )
}

// A PAIRED-DOCUMENT item: `stimulus.documents[]`, each with its OWN citation.
// Sam's ask, 2026-09-18, and the reason is right — two sources must never share
// one citation line, and the Regents uses paired documents constantly. A single
// `stimulus` object still works unchanged; this is additive.
function StimulusBlock({ stimulus, accent }) {
  if (!stimulus) return null
  const docs = Array.isArray(stimulus.documents) ? stimulus.documents : null
  if (!docs) return <StimulusFigure doc={stimulus} accent={accent} />
  return (
    <div className="doc-pair">
      {stimulus.caption && <div className="pair-cap">{stimulus.caption}</div>}
      {docs.map((d, i) => (
        <div className="pair-item" key={i}>
          <div className="doc-tag">Document {d.label || i + 1}</div>
          <StimulusFigure doc={d} accent={accent} />
        </div>
      ))}
    </div>
  )
}

function McItem({ item, accent, n, total, onAnswer, course }) {
  const [picked, setPicked] = useState(null)
  const answered = picked != null
  const right = answered && picked === item.correct
  const choose = k => { if (picked == null) { setPicked(k); onAnswer(k === item.correct) } }
  return (
    <div className="mc-item">
      <div className="mc-head">
        <span className="mc-count">Question {n} of {total}</span>
        {item.skill_line && course && (
          <span className="line-chip">{lineLabel(course, item.skill_line)}</span>
        )}
      </div>
      <StimulusBlock stimulus={item.stimulus} accent={accent} />
      <div className="mc-q">{item.question}</div>
      <div className="mc-choices">
        {(item.choices || []).map(c => {
          let cls = 'mc-choice'
          if (answered) {
            if (c.key === item.correct) cls += ' correct'
            else if (c.key === picked) cls += ' incorrect'
            else cls += ' dim'
          }
          return (
            <button key={c.key} className={cls} disabled={answered}
                    onClick={() => choose(c.key)}>
              <b>{c.key}.</b> <span>{c.text}</span>
              {/* The verdict is a WORD, not just a colour (§7.5). */}
              {answered && c.key === item.correct && <em className="mc-mark">Correct</em>}
              {answered && c.key === picked && !right && <em className="mc-mark">Not this one</em>}
            </button>
          )
        })}
      </div>
      {answered && (
        <div className="mc-reveal">
          {item.reasoning && <p className="mc-reasoning">{item.reasoning}</p>}
          {item.evidence_line && (
            <p className="mc-evidence"><b>The line that proves it:</b> {item.evidence_line}</p>
          )}
          {!right && item.distractors?.[picked] && (
            <p className="mc-distractor"><b>Why that one tempts:</b> {item.distractors[picked]}</p>
          )}
          {/* Never a score. Scoring lives on paper, on the descriptor card,
              in the gradebook. A second number here competes with the one the
              card promised, and the card has to hold all year. */}
        </div>
      )}
    </div>
  )
}

// RULED 2026-09-18 (BK, via Sam) — closes the streak-vs-score item held since 08-31.
// Two counters, both SESSION-SCOPED, neither able to decrease:
//   reps    — every attempt this session. Only increments.
//   bestRun — the longest correct run this session. A miss ends the CURRENT run;
//             the DISPLAYED number holds at the best so far and never drops to zero.
// Session-scoped means no storage at all — not localStorage, not sessionStorage.
// It lives in this component and is gone when the tab closes. Stricter than
// "lost if they wipe their history", and squarely inside canon §1.
// Neither is a point value, a percentage or a rubric grid, so the no-score rule
// (spec §7.2) is intact and unamended.
// WHY THERE IS NO RESET: a streak that drops to zero is a ratchet, and it teaches
// that being wrong destroys what you built. It lands hardest on the kid at a 2 who
// strings four together and misses the fifth. Do not reintroduce it.
// Ships SILENT on a miss — a line there would be guide voice, and voice is parked.
function Counters({ reps, bestRun }) {
  if (!reps) return null
  return (
    <div className="counters" role="status" aria-live="polite">
      <span className="counter"><b>{reps}</b> {reps === 1 ? 'rep' : 'reps'} this session</span>
      {bestRun > 1 && <span className="counter"><b>{bestRun}</b> in a row, best run</span>}
    </div>
  )
}

function ItemSet({ pack, course, heading }) {
  const items = (pack && pack.items) || []
  const [reps, setReps] = useState(0)
  const [run, setRun] = useState(0)
  const [bestRun, setBestRun] = useState(0)
  const record = correct => {
    setReps(r => r + 1)
    setRun(r => { const next = correct ? r + 1 : 0; setBestRun(b => Math.max(b, next)); return next })
  }
  if (!items.length) return null
  return (
    <>
      {heading && <h4 className="set-heading">{heading}</h4>}
      {/* The authoring desk's own intro wins. The stock line is a FALLBACK, not a
          banner — Sam's 11.1 intro already says nothing is scored and nothing is
          saved, and printing both said it twice in two voices. */}
      {pack.intro
        ? <p className="mc-preamble">{pack.intro}</p>
        : <p className="mc-preamble">
            Pick an answer, then read why. Nothing here is scored and nothing is saved &mdash;
            you can be wrong on purpose to find out what the wrong one was for.
          </p>}
      {items.map((it, i) => (
        <McItem key={it.n ?? i} item={it} accent={course.accent} course={course}
                n={i + 1} total={items.length} onAnswer={record} />
      ))}
      <Counters reps={reps} bestRun={bestRun} />
    </>
  )
}

function StimulusActivity({ course, activity, pack, onBack }) {
  const items = (pack && pack.items) || []
  return (
    <div className="wrap">
      <ScreenHeader label={activity.label} onBack={onBack} color={course.accent} back="Back" />
      <div className="detail" style={{ maxWidth: 760 }}>
        {!items.length
          ? <div className="empty" style={{ textAlign: 'left' }}>
              <div className="empty-title">This set has no items yet</div>
              <p>The mechanic is built. Its questions arrive by reference from the desk that
                 owns this course, as an item pack named in <code>content_ref</code>.</p>
            </div>
          : <ItemSet pack={pack} course={course} />}
      </div>
    </div>
  )
}

function ScreenHeader({ label, onBack, color, back }) {
  return (
    <div className="screen-header" style={{ borderBottom: `1px solid ${color}44` }}>
      <button className="back-btn" onClick={onBack}>&larr; {back}</button>
      <div className="screen-header-title" style={{ color }}>{label}</div>
    </div>
  )
}

// ============================================================
// APP
// ============================================================
export default function App() {
  const [manifest, setManifest] = useState(null)
  const [games, setGames] = useState([])
  const [actIndex, setActIndex] = useState(null)
  const [drillIndex, setDrillIndex] = useState(null)
  const [pack, setPack] = useState(null)
  const [error, setError] = useState(null)
  const [courseId, setCourseId] = useState(null)
  const [unitSlug, setUnitSlug] = useState(null)
  const [stationSlug, setStationSlug] = useState(null)

  useEffect(() => {
    fetch(MANIFEST_URL)
      .then(r => { if (!r.ok) throw new Error(`manifest ${r.status}`); return r.json() })
      .then(setManifest)
      .catch(e => setError(e.message))
    // Games are a soft dependency: if the list fails, the Arena still opens and
    // scenario_link activities simply do not render. Never a blank Arena.
    fetch(GAMES_URL).then(r => r.json()).then(d => setGames(d.games || [])).catch(() => setGames([]))
  }, [])

  const course = useMemo(
    () => (manifest?.courses || []).find(c => c.id === courseId) || null,
    [manifest, courseId]
  )
  const unit = useMemo(
    () => (course?.units || []).find(u => u.slug === unitSlug) || null,
    [course, unitSlug]
  )
  const station = useMemo(
    () => (course?.stations || []).find(s => s.slug === stationSlug) || null,
    [course, stationSlug]
  )

  if (error) return (
    <><style>{STYLES}</style>
      <div className="wrap"><div className="empty">
        <div className="empty-title">The Arena could not load its manifest</div>
        <p><code>{MANIFEST_URL}</code> — {error}</p>
      </div></div></>
  )
  if (!manifest) return (
    <><style>{STYLES}</style><div className="loading">Opening the Arena&hellip;</div></>
  )

  let screen
  if (!course) screen = <Splash manifest={manifest} onPick={setCourseId} />
  else if (station && drillIndex != null && (station.drills || [])[drillIndex]) {
    screen = <DrillScreen course={course} station={station} drill={station.drills[drillIndex]}
                          onBack={() => setDrillIndex(null)} />
  }
  else if (station) screen = <StationScreen course={course} station={station}
                                            onOpenDrill={setDrillIndex}
                                            onBack={() => { setStationSlug(null); setDrillIndex(null) }} />
  else if (unit && actIndex != null) {
    const act = (unit.activities || []).filter(isLive)[actIndex]
    screen = <StimulusActivity course={course} activity={act} pack={pack}
                               onBack={() => { setActIndex(null); setPack(null) }} />
  }
  else if (unit) screen = <UnitRoom course={course} unit={unit} games={games}
                                    onOpenActivity={i => {
                                      const a = (unit.activities || []).filter(isLive)[i]
                                      setActIndex(i); setPack(null)
                                      if (resolves(a?.content_ref)) {
                                        fetch(`/content/${a.content_ref}`)
                                          .then(r => r.ok ? r.json() : null).then(setPack).catch(() => setPack(null))
                                      }
                                    }}
                                    onBack={() => setUnitSlug(null)} />
  else screen = (
    <CourseDoor
      course={course}
      onOpenStation={setStationSlug}
      onOpenUnit={setUnitSlug}
      onBack={() => { setCourseId(null); setUnitSlug(null); setStationSlug(null) }}
    />
  )

  return (
    <>
      <style>{STYLES}</style>
      {screen}
      <div className="wrap" style={{ paddingTop: 0, paddingBottom: 28 }}>
        <a href={HOME_URL} className="back-btn" style={{ fontSize: 13.5 }}>
          &larr; flashpointhistory.com
        </a>
      </div>
    </>
  )
}
