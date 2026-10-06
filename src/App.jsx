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

import { useState, useEffect, useMemo, useRef } from 'react'
import { parseHash, buildHash } from './deeplinks.js'
import { Unit0Card, Unit0Room, UNIT0_STYLES } from './unit0.jsx'
import { ThreadsLane, THREADS_STYLES } from './threads.jsx'
import { IssuesLane, ISSUES_STYLES } from './issues.jsx'
import { useRefCards, REF_STYLES } from './refcards.jsx'
import { useWritingLab, WritingLabLane, WritingLabCards, BlueprintScreen, WRITINGLAB_STYLES, WL_WORDS } from './writinglab.jsx'
import { useAtlas, AtlasLane, AtlasViewer, UnitAtlasPage, MapCards, mapsForUnit, ATLAS_STYLES, ATLAS_WORDS } from './atlas.jsx'
import { DocAssistCard, DocAssistHome, DocAssistDoc, DOCASSIST_STYLES, CHROME as DA, openCasefiles } from './docassist.jsx'
import { DocCheckSet, DOCCHECK_STYLES } from './doccheck.jsx'
import { setCoachBank, CoachSays, welcomeLine, skillLine, setDoneLine, signoffLine, noteSetDone, workedThisVisit, useStuck, BK_PORTRAIT } from './coach.jsx'
import {
  LADDER_STYLES, SkillGauges, Ladder, BestFit, SentenceBuild, GuidedWrite, Enrichment,
  UnitBrief, LEVEL_TYPES, useProgress, roomSkills, ladderLevels, levelOpen, currentUnit, levelsDone,
} from './ladder.jsx'
import {
  OFFICE_STYLES, OfficeDoor, OfficeRoom, OfficeTheme, officeVisible, visibleThemes,
  OFFICE_COURSE, OFFICE_SKILL, officeUnit,
} from './office.jsx'

// BK's Office stays hidden until the manifest publishes it. A reviewer opens the
// branch preview with ?preview=office to see it, placeholders and all.
const PREVIEW_OFFICE = (() => {
  try { return new URLSearchParams(window.location.search).get('preview') === 'office' } catch { return false }
})()

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

// Will's GS10R station reps (2026-09-21) write a table as
// `content: { title, columns, rows }` — an OBJECT in the field every other
// stimulus uses for text. The station renderer put it straight into a <p>, and
// React crashed the whole Arena to a blank screen on Enduring Issue. Read that
// shape too, alongside the two the unit rooms already accepted.
function tableOf(doc) {
  const c = doc?.content
  if (c && typeof c === 'object' && Array.isArray(c.rows))
    return { caption: c.title, head: c.columns || [], body: c.rows }
  if (doc?.kind === 'table' && doc.rows)
    return { caption: doc.caption, head: doc.rows[0], body: doc.rows.slice(1) }
  return null
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
  const table = tableOf(doc)
  const hasText = !table && typeof doc.content === 'string' && !!doc.content
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
      {table && <DataTable table={table} />}
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
            rep.exam_meta.question_ref &&
              (/^\d+$/.test(rep.exam_meta.question_ref) ? `Q${rep.exam_meta.question_ref}` : rep.exam_meta.question_ref)]
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
// `opens_on` (YYYY-MM-DD, the device's own date, like the Office's month rule): a published
// activity can ship ahead and appear on the day kids start it (11.1 Test Practice, Mon 10/5).
const todayLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const onDate = (o) => !o?.opens_on || todayLocal() >= String(o.opens_on)
const isLive = (o) => o?.published === true && isOpen(o) && onDate(o)

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
.wrap{max-width:1240px;margin:0 auto;padding:28px 24px 72px}
.arena-type{font-family:'Barlow Condensed','Outfit',system-ui,sans-serif}

/* FEEL FLOOR: every interactive surface answers under 100ms. */
button,[role=button],a.door,.card{transition:transform .14s var(--ease-settle),
  background-color .12s var(--ease-calm),border-color .12s var(--ease-calm),
  box-shadow .14s var(--ease-calm);}
button:active:not(:disabled),a.door:active{transform:scale(.985)}
:focus-visible{outline:3px solid var(--gold-lit);outline-offset:3px;border-radius:6px}

/* ---------- SPLASH ---------- */
.splash{text-align:center;padding-top:30px;position:relative}
/* The Arena's own front door, as the page itself. A fictional building — chrome,
   not a Realness asset. BK, 2026-09-27 16:54: "main page should have the exterior
   shot in the background but brightened with the doors over top of it. should not
   require someone to scroll down to see where they're going."
   The picture is fixed behind the page and brightened. A light scrim darkens only the
   sky band under the title and the floor under the words; the building stays bright.
   Everything a kid reads sits on a solid door card or a smoked plate, so contrast
   never depends on the photo. */
.splash-bg{position:fixed;inset:0;z-index:-1;overflow:hidden;background:var(--canvas)}
.splash-bg-img{position:absolute;inset:0;
  background:url('/images/arena/frontdoor-v2.webp') center 42%/cover no-repeat;
  filter:brightness(1.14) saturate(1.06)}
.splash-bg-scrim{position:absolute;inset:0;background:linear-gradient(180deg,
  color-mix(in srgb,var(--canvas) 62%,transparent) 0%,
  color-mix(in srgb,var(--canvas) 26%,transparent) 26%,
  color-mix(in srgb,var(--canvas) 8%,transparent) 50%,
  color-mix(in srgb,var(--canvas) 40%,transparent) 100%)}
/* BK 17:06: "the doors need to be a little lower." They drop as far as the window
   allows while the whole row stays above the fold (Chromebook window 1366x657 → 97px). */
.splash .doors{margin-top:clamp(22px,calc(100vh - 560px),150px)}
.splash .door-art{height:104px}
/* The words below the doors: one smoked plate, the building showing around it. */
.splash-words{max-width:760px;margin:34px auto 20px;padding:26px 26px 12px;border-radius:14px;
  background:color-mix(in srgb,var(--canvas) 84%,transparent);
  -webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);border:1px solid var(--edge)}
.splash-words .epigraph{background:none;-webkit-backdrop-filter:none;backdrop-filter:none;margin-bottom:26px}
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
.splash-intro{max-width:700px;margin:0 auto 10px;text-align:left}
.splash-intro p{color:var(--white);font-size:18.5px;line-height:1.66;margin-bottom:16px}
.splash-intro p.lede{font-family:'Barlow Condensed',sans-serif;font-size:32px;line-height:1.16;
  text-transform:uppercase;letter-spacing:.01em;color:var(--gold);margin-bottom:16px;text-align:center}
.placeholder{max-width:620px;margin:0 auto 12px;padding:14px 16px;text-align:left;
  border:1px dashed var(--edge);border-radius:10px;
  background:color-mix(in srgb,var(--card) 88%,transparent);
  color:var(--grey);font-size:14.5px;line-height:1.55;backdrop-filter:blur(3px)}
.placeholder b{color:var(--gold-lit);display:block;margin-bottom:3px;
  font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.09em;font-size:12.5px}
.epigraph{max-width:700px;margin:0 auto 30px;padding:10px 16px 10px 18px;border-left:2px solid var(--gold);text-align:left;
  border-radius:0 10px 10px 0;background:color-mix(in srgb,var(--canvas) 74%,transparent);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.epigraph p{color:var(--grey);font-style:italic;font-size:17.5px;line-height:1.6;margin-bottom:8px}
.epigraph cite{color:var(--grey);font-style:normal;font-size:12.5px;opacity:.85;display:block}

/* ---------- THE GUIDE ---------- */
/* BK's lines sit on a parchment scroll, so his voice pops off the navy (BK 2026-09-27 09:43).
   Pure CSS, no image: cream paper, a darker burnt edge, a rolled rod top and bottom.
   Ink #2A1C0C on the paper measures 9.9:1 at its darkest, 13.6:1 at its lightest. The scroll is chrome, not a document:
   it never carries a quotation or a source. */
.guide-says{display:flex;gap:16px;align-items:flex-start;margin:14px 0 30px;padding:20px 24px;
  position:relative;max-width:760px;border-radius:4px;
  background:
    radial-gradient(ellipse 60% 80% at 18% 30%,rgba(255,250,235,.55),transparent 70%),
    radial-gradient(ellipse 50% 70% at 85% 75%,rgba(140,95,40,.16),transparent 70%),
    linear-gradient(180deg,#F4E8C8 0%,#EBD9AC 55%,#DFC690 100%);
  border-left:1px solid #B8955A;border-right:1px solid #B8955A;
  box-shadow:inset 0 0 26px rgba(120,80,30,.38),inset 0 0 3px rgba(90,60,20,.5),0 8px 20px rgba(0,0,0,.5)}
.guide-says::before,.guide-says::after{content:'';position:absolute;left:-10px;right:-10px;height:14px;
  border-radius:7px;background:linear-gradient(180deg,#A9854A 0%,#F2E3BD 40%,#D2B37A 70%,#8E6C36 100%);
  box-shadow:0 2px 5px rgba(0,0,0,.45)}
.guide-says::before{top:-9px}
.guide-says::after{bottom:-9px}
.guide-says p{color:#2A1C0C;font-size:18px;line-height:1.58;margin:0;text-shadow:none!important}
.guide-face{width:64px;height:64px;border-radius:50%;flex:none;object-fit:cover;
  border:2px solid var(--gold)}
.guide-says .guide-face{border-color:#6B4A1E}
.guide-face.lg{width:140px;height:140px;border-width:3px;margin:0 auto 22px;display:block}

/* ---------- DOORS ---------- */
.doors{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:22px;
  max-width:960px;margin:36px auto 0}
a.door,div.door{display:block;text-align:left;text-decoration:none;padding:24px 22px 22px;
  border-radius:14px;background:color-mix(in srgb,var(--card) 92%,transparent);
  border:1px solid var(--edge);position:relative;backdrop-filter:blur(4px)}
a.door{cursor:pointer}
a.door:hover{background:var(--card-lit);border-color:var(--gold);transform:translateY(-3px);
  box-shadow:0 10px 30px -12px #0006}
.door-accent{height:4px;border-radius:2px;width:46px;margin-bottom:14px}
/* A window into each room (BK, 2026-09-27: "Global and US need one too"). */
a.door.has-art{padding-top:0;overflow:hidden}
.door-art{margin:0 -22px 16px;height:118px;overflow:hidden;border-bottom:1px solid var(--edge)}
.door-art img{width:100%;height:100%;object-fit:cover;display:block}
/* THE SIGNAL RED (BK, 2026-09-27: option A). Borders on what a kid can walk through
   or press to move around, and the message banner. Never on an answer choice: a
   wrong answer keeps its own muted brick and the words "Not this one". */
a.door, button.lane-tab, button.practice-row, .bottom-back-btn{border:2px solid var(--arena-signal)}
.door-label{font-family:'Barlow Condensed',sans-serif;font-size:32px;line-height:1.08;
  text-transform:uppercase;color:var(--white);margin-bottom:9px}
.door-blurb{color:var(--grey);font-size:16.5px;line-height:1.55}
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

/* ---------- BOTTOM BACK ---------- */
.bottom-back{margin-top:34px;padding-top:18px;border-top:1px solid var(--edge);max-width:860px}
.bottom-back-btn{background:var(--card);border:1.5px solid var(--arena-choice-edge);color:var(--white);
  padding:12px 18px;border-radius:9px;font-family:'Outfit',sans-serif;font-size:16px;cursor:pointer}
.bottom-back-btn:hover{border-color:var(--gold)}

/* ---------- HEADER ---------- */
.screen-header{display:flex;align-items:center;gap:16px;padding:12px 0 14px;margin-bottom:22px}
.back-btn{background:none;border:none;color:var(--grey);font-size:16px;cursor:pointer;
  font-family:'Outfit',sans-serif;padding:6px 10px 6px 0}
.back-btn:hover{color:var(--white)}
.screen-header-title{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;
  letter-spacing:.13em;font-size:17px;margin-left:auto}

/* ---------- LANES ---------- */
.lane-nav{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:24px}
.lane-tab{background:var(--card);border:1px solid var(--edge);color:var(--grey);padding:9px 16px;
  border-radius:9px;cursor:pointer;font-family:'Barlow Condensed',sans-serif;
  text-transform:uppercase;letter-spacing:.1em;font-size:13.5px}
.lane-tab:hover{color:var(--white);background:var(--card-lit);border-color:var(--gold)}
.lane-tab[aria-selected=true]{color:var(--canvas);font-weight:700}
.lane-tab:disabled{opacity:.42;cursor:default}
.lane-intro{color:var(--grey);font-size:17px;line-height:1.6;margin-bottom:22px;max-width:740px}
/* THE RIGHT ROOM (BK 2026-10-02): the unit we're in, whole, on the door; finished units say so. */
.unit-here{color:var(--white);font-size:17px;line-height:1.5;margin:-4px 0 16px;max-width:740px}
.door-room{margin-top:34px;padding-top:22px;border-top:1px solid var(--edge)}
.unit-elsewhere{color:var(--white);font-size:16.5px;line-height:1.5;margin:26px 0 0;padding:12px 15px;max-width:740px;
  background:var(--card);border:1px solid var(--arena-choice-edge);border-left:4px solid var(--gold);border-radius:9px}
.link-btn{background:none;border:none;padding:0 1px;font:inherit;color:var(--gold-lit);text-decoration:underline;text-underline-offset:3px;cursor:pointer;min-height:24px}
.link-btn:hover{color:var(--gold)}
.unit-elsewhere .link-btn{display:inline;width:auto;min-height:0;margin:0;padding:0 1px;border:none;border-radius:0;background:none;box-shadow:none;
  font:inherit;font-weight:700;color:var(--gold-lit);text-decoration:underline;text-underline-offset:3px;transform:none}
.unit-finished{display:flex;flex-wrap:wrap;align-items:center;gap:12px 18px;margin:0 0 26px;padding:13px 16px;max-width:900px;
  background:var(--card);border:1.5px solid var(--gold);border-radius:10px;box-shadow:0 6px 18px rgba(0,0,0,.28)}
.unit-finished p{margin:0;color:var(--white);font-size:17px;line-height:1.5;flex:1 1 280px}
.btn-now{background:var(--gold);color:var(--canvas);border:1.5px solid var(--gold);border-radius:9px;padding:10px 16px;min-height:44px;
  font-family:'Outfit',sans-serif;font-size:16px;font-weight:700;cursor:pointer}
.btn-now:hover{background:var(--gold-lit);border-color:var(--gold-lit)}

/* ---------- CARDS ---------- */
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(268px,1fr));gap:18px}
.card{text-align:left;width:100%;padding:22px 20px;border-radius:12px;background:var(--card);
  border:1px solid var(--edge);color:inherit;font-family:'Outfit',sans-serif;cursor:pointer}
.card:hover:not(.card.off){background:var(--card-lit);border-color:var(--gold);transform:translateY(-2px)}
.card.off{opacity:.45;cursor:default}
a.card{display:block;text-decoration:none}
/* Room cards (review + classroom assignment) sit side by side and read top-down alike. */
.room-cards>.card{display:flex;flex-direction:column;align-items:flex-start;justify-content:flex-start;text-align:left}
.card-name{font-family:'Barlow Condensed',sans-serif;font-size:24px;line-height:1.14;
  text-transform:uppercase;color:var(--white);margin-bottom:8px}
.card.off .card-name{color:var(--dim)}
.card-blurb{color:var(--grey);font-size:15.5px;line-height:1.5}
.card-type{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;
  letter-spacing:.13em;font-size:11px;color:var(--gold);margin-bottom:7px}

/* ---------- EMPTY / NOT WIRED ---------- */
.empty{border:1px dashed var(--edge);border-radius:12px;padding:30px 24px;text-align:center;
  color:var(--grey);max-width:620px}
.empty-title{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;
  letter-spacing:.11em;font-size:16px;color:var(--white);margin-bottom:9px}
.empty p{font-size:16.5px;line-height:1.6;margin-bottom:9px}
.detail{max-width:780px}
.detail h2{font-family:'Barlow Condensed',sans-serif;font-size:40px;text-transform:uppercase;
  line-height:1.08;color:var(--white);margin-bottom:12px}
.detail .sub{color:var(--grey);font-size:18.5px;line-height:1.55;margin-bottom:24px}
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
.tbl{border-collapse:collapse;width:100%;min-width:520px;font-size:15px}
.tbl th,.tbl td{border:1px solid var(--edge);padding:8px 10px;text-align:left;vertical-align:top;
  line-height:1.45}
.tbl thead th{background:var(--card-lit);color:var(--gold);font-family:'Barlow Condensed',sans-serif;
  text-transform:uppercase;letter-spacing:.08em;font-size:11.5px;font-weight:600;white-space:nowrap}
.tbl tbody th{color:var(--white);font-weight:600;background:color-mix(in srgb,var(--card-lit) 55%,transparent)}
.tbl tbody td{color:var(--grey)}
.set-heading{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.12em;
  font-size:12.5px;color:var(--gold);margin:26px 0 10px;padding-top:18px;border-top:1px solid var(--edge)}

/* ---------- STATION REPS ---------- */
.rep{border:1px solid var(--edge);border-radius:12px;padding:24px 22px;margin-bottom:22px;background:var(--card)}
.rep-meta{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.12em;
  font-size:11px;color:var(--gold);margin-bottom:13px}
.doc-tag{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.12em;
  font-size:10.5px;color:var(--grey);margin-bottom:8px}
.doc-held{border:1px dashed var(--edge);border-radius:7px;padding:12px 13px;margin-bottom:9px;
  display:flex;flex-direction:column;gap:5px;background:color-mix(in srgb,var(--canvas) 60%,transparent)}
.doc-scan-note{color:var(--grey);font-size:12px;font-style:italic;margin-bottom:8px;opacity:.85}
.doc-held b{color:var(--gold-lit);font-size:12.5px;font-family:'Barlow Condensed',sans-serif;
  text-transform:uppercase;letter-spacing:.1em}
.doc-held span{color:var(--grey);font-size:15.5px;line-height:1.5}
.rep-prompt{color:var(--white);font-size:18px;line-height:1.6;margin:16px 0 18px;
  white-space:pre-wrap;padding-left:14px;border-left:2px solid var(--gold)}
.rep-label{display:block;font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;
  letter-spacing:.12em;font-size:11.5px;color:var(--gold);margin-bottom:7px}
.rep-box{width:100%;padding:14px 15px;border-radius:9px;background:var(--canvas);
  border:1px solid var(--edge);color:var(--white);font-family:'Outfit',sans-serif;
  font-size:17px;line-height:1.6;resize:vertical}
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
.rep-exemplar{color:var(--white);font-size:17.5px;line-height:1.68;white-space:pre-wrap;
  padding:15px 16px;border-radius:9px;background:var(--canvas);border:1px solid var(--edge)}
.rep-focus{margin-top:14px;padding:13px 15px;border-radius:9px;border-left:3px solid var(--gold);
  background:color-mix(in srgb,var(--gold) 9%,transparent);color:var(--white);
  font-size:16.5px;line-height:1.55}
.rep-check{list-style:none;padding:0;margin:0}
.rep-check li{margin-bottom:9px}
.rep-check label{display:flex;gap:10px;align-items:flex-start;cursor:pointer;
  color:var(--white);font-size:16.5px;line-height:1.5}
.rep-check input{margin-top:3px;width:17px;height:17px;accent-color:var(--gold);flex:none;cursor:pointer}

/* ---------- STIMULUS / MC ---------- */
.mc-preamble{color:var(--grey);font-size:16.5px;line-height:1.6;margin-bottom:22px}
.mc-item{border:1px solid var(--edge);border-radius:12px;padding:20px 18px;margin-bottom:18px;
  background:var(--card)}
.mc-count{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;
  letter-spacing:.14em;font-size:11px;color:var(--gold);margin-bottom:10px}
/* Primary-source documents get their own surface — paper, not the app's navy
   panel — so a document reads as a document the instant it appears (BK, 2026-09-19). */
.stimulus{margin:0 0 20px;border:1px solid;border-radius:10px;padding:22px 24px;
  position:relative;color:#2c2110;
  background:
    repeating-linear-gradient(transparent 0px,transparent 29px,rgba(90,70,35,.15) 30px),
    linear-gradient(160deg,#f8f0da,#ecdeb8);
  box-shadow:0 16px 36px -18px rgba(0,0,0,.7),inset 0 0 0 1px rgba(60,44,18,.2)}
.stimulus .doc-tag{color:#8a6a1f}
.stimulus img{width:100%;border-radius:6px;display:block;margin-bottom:12px;
  box-shadow:0 6px 18px -8px rgba(0,0,0,.55)}
.stimulus-text summary{cursor:pointer;font-family:'Barlow Condensed',sans-serif;
  text-transform:uppercase;letter-spacing:.11em;font-size:12px;color:#7a5a15;margin-bottom:9px}
.stimulus-text p{color:#2c2110;font-size:16.5px;line-height:1.75;white-space:pre-wrap;
  font-family:Georgia,'Times New Roman',serif}
.stimulus figcaption{color:#6b5324;font-size:13px;font-style:italic;margin-top:12px;
  border-top:1px solid rgba(60,44,18,.22);padding-top:10px}
/* A chart on paper takes the paper's ink — the navy-panel greys above wash out
   on cream (first seen on Enduring Issue rep 2, 2026-09-21). */
.stimulus .tbl-cap{color:#7a5a15}
.stimulus .tbl th,.stimulus .tbl td{border-color:rgba(60,44,18,.3)}
.stimulus .tbl thead th{background:rgba(60,44,18,.12);color:#5a4210}
.stimulus .tbl tbody th{background:rgba(60,44,18,.07);color:#2c2110}
.stimulus .tbl tbody td{color:#2c2110}
.stimulus .doc-scan-note{color:#6b5324;opacity:1}
.stimulus .doc-held{background:rgba(255,255,255,.4);border-color:rgba(60,44,18,.3)}
.stimulus .doc-held b{color:#7a5a15}
.stimulus .doc-held span{color:#4a3a1c}
.mc-q{color:var(--white);font-size:19.5px;line-height:1.5;margin-bottom:14px;font-weight:500}
.mc-choices{display:flex;flex-direction:column;gap:8px}
.mc-choice{display:flex;gap:10px;align-items:flex-start;text-align:left;width:100%;
  padding:14px 16px;border-radius:9px;background:var(--arena-choice);border:1.5px solid var(--arena-choice-edge);
  color:var(--white);font-family:'Outfit',sans-serif;font-size:16.5px;line-height:1.48;cursor:pointer}
.mc-choice:hover:not(:disabled){border-color:var(--gold);background:color-mix(in srgb,var(--arena-choice) 88%,var(--gold))}
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
.mc-reveal p{font-size:16.5px;line-height:1.6;margin-bottom:9px;color:var(--grey)}
.mc-reveal b{color:var(--white)}
.mc-reasoning{color:var(--white) !important}
.mc-why{color:#C9D4E4;font-size:16px;line-height:1.55;margin-top:6px}

/* Session counters. Not a score — no percentage, no rubric, no total possible. */
.counters{display:flex;gap:10px;flex-wrap:wrap;margin-top:6px;padding-top:16px;
  border-top:1px solid var(--edge)}
.counter{padding:8px 14px;border-radius:8px;background:var(--card);border:1px solid var(--edge);
  color:var(--grey);font-size:15px}
.counter b{color:var(--gold);font-size:16px;font-family:'Barlow Condensed',sans-serif;
  margin-right:3px}

/* ---------- MATCHING ---------- */
.match-cols{display:grid;grid-template-columns:1fr 1fr;gap:14px 20px;margin-bottom:22px}
.match-col{display:flex;flex-direction:column;gap:8px}
.mc-choice.selected{border-color:var(--gold);background:color-mix(in srgb,var(--arena-choice) 80%,var(--gold));
  box-shadow:inset 0 0 0 2px var(--gold)}
.mc-choice.paired{opacity:.72;border-style:dashed}
.match-tag{font-size:12px;color:var(--gold);font-family:'Barlow Condensed',sans-serif;
  text-transform:uppercase;letter-spacing:.08em}

/* ---------- INTERIOR BACKDROP ----------
   The gym the front door opens into (BK, 2026-09-19). Fixed so it reads as a
   room you're standing in rather than a scrolling image; dimmed enough that
   every card and line of text stays readable over it at any scroll position. */
.app-interior{position:relative}
.app-interior::before{
  content:'';position:fixed;inset:0;z-index:-1;
  background:
    linear-gradient(180deg,
      color-mix(in srgb,var(--canvas) var(--scrim-in-top),transparent) 0%,
      color-mix(in srgb,var(--canvas) var(--scrim-in-mid),transparent) 55%,
      color-mix(in srgb,var(--canvas) var(--scrim-in-low),transparent) 100%),
    url('/images/arena/gym-interior-v2.webp') center 28%/cover no-repeat;
}
/* Phones get the 640-wide copy of the same picture (BK's gym v2, 2026-09-27). */
@media (max-width:700px){
  .app-interior::before{
    background:
      linear-gradient(180deg,
        color-mix(in srgb,var(--canvas) var(--scrim-in-top),transparent) 0%,
        color-mix(in srgb,var(--canvas) var(--scrim-in-mid),transparent) 55%,
        color-mix(in srgb,var(--canvas) var(--scrim-in-low),transparent) 100%),
      url('/images/arena/gym-interior-v2-640.webp') center 28%/cover no-repeat;
  }
}
/* Type that sits straight on the photo (not on a card) gets a soft shadow, so a
   lighter scrim never costs it contrast. Cards are solid and need none. */
.app-interior .screen-header, .app-interior h1, .app-interior h2, .app-interior .room-section,
.app-interior .skill-about, .app-interior .lane-intro, .splash-intro p, .epigraph p, .epigraph cite{
  text-shadow:0 1px 3px rgba(5,9,18,.9),0 0 18px rgba(5,9,18,.75)}
/* Longer loose lines sit on a small smoked-glass plate: the photo shows around
   it, and the line keeps AA contrast whatever the scrim is set to. */
.app-interior .lane-intro, .app-interior .skill-about{display:inline-block;padding:7px 13px;border-radius:9px;
  background:color-mix(in srgb,var(--canvas) 78%,transparent);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);
  color:#B4C2D6}

/* REDUCED MOTION — its own feedback language, not a stripped one.
   Motion cues are replaced by a persistent border-weight + inset shade. */
@media (prefers-reduced-motion:reduce){
  button,[role=button],a.door,.card{transition:background-color .01ms,border-color .01ms}
  a.door:hover,.card:hover:not(.card.off){transform:none;border-color:var(--gold);
    box-shadow:inset 0 0 0 1px var(--gold)}
  button:active:not(:disabled),a.door:active{transform:none;box-shadow:inset 0 0 0 2px var(--gold-lit)}
}
@media (max-width:560px){
  .wrap{padding:20px 16px 56px}
  .doors{grid-template-columns:1fr}
  /* Front page on a phone: all three doors above the fold. The door's picture
     becomes a strip down its left side; every word stays. */
  .splash{padding-top:6px}
  .splash h1{font-size:40px}
  .splash-tag{margin-bottom:0}
  .splash .doors{gap:12px;margin-top:clamp(16px,calc(100vh - 740px),110px)}
  .splash a.door.has-art{display:grid;grid-template-columns:84px 1fr;column-gap:14px;
    padding:12px 14px 12px 0;align-items:start}
  .splash .door-art{grid-column:1;grid-row:1 / span 4;align-self:stretch;margin:-12px 0;height:auto;
    border-bottom:0;border-right:1px solid var(--edge);position:relative}
  .splash .door-art img{position:absolute;inset:0}
  .splash a.door.has-art > :not(.door-art){grid-column:2}
  .splash .door-accent{margin:2px 0 8px}
  .splash .door-label{font-size:23px;margin-bottom:4px}
  .splash .door-blurb{font-size:14.5px;line-height:1.45}
  .splash .flag{margin-top:8px;justify-self:start}
  .splash-words{padding:20px 16px 6px;margin-top:26px}
  .grid{grid-template-columns:1fr}
  .match-cols{grid-template-columns:1fr}
}
`

// ============================================================
// SPLASH — two doors. BK introduces the Arena himself (ruling E).
// ============================================================
function Splash({ manifest, onPick, onOffice }) {
  const { splash = {}, courses = [] } = manifest
  // The guide meets a student here first, then again inside. Same face either way.
  const guidePortrait = (courses.find(c => c.guide?.portrait) || {}).guide?.portrait || null
  return (
    <div className="wrap splash">
      {/* The exterior IS the page (BK, 2026-09-27 16:54: "main page should have the
          exterior shot in the background but brightened with the doors over top of it.
          should not require someone to scroll down to see where they're going.")
          Fixed behind everything, brightened; the doors sit on it above the fold, and
          the epigraph and BK's welcome follow below them on a smoked plate. */}
      <div className="splash-bg" aria-hidden="true">
        <div className="splash-bg-img" />
        <div className="splash-bg-scrim" />
      </div>
      <div className="splash-mark">Flashpoint History</div>
      <h1>The Arena</h1>
      <div className="splash-tag">Train here. Perform anywhere.</div>
      <div className="doors">
        {/* Order (BK, 2026-09-27): Global · BK's Office · U.S. The Office is the
            neutral ground that serves both, so it stands between them. */}
        {courses.flatMap((c, ci) => [ci === 1 && officeVisible(manifest.office, PREVIEW_OFFICE)
          ? <OfficeDoor key="office" office={manifest.office} onOpen={onOffice} preview={PREVIEW_OFFICE} /> : null, c]).filter(Boolean).map(c => {
          if (!c.id) return c
          const open = isOpen(c)
          const Tag = open ? 'a' : 'div'
          return (
            <Tag
              key={c.id}
              className={`door${open ? '' : ' building'}${c.door_image ? ' has-art' : ''}`}
              {...(open
                ? { href: `#/${c.id}`, onClick: e => { e.preventDefault(); onPick(c.id) } }
                : { 'aria-disabled': 'true' })}
            >
              {c.door_image && (
                <div className="door-art" aria-hidden="true"><img src={`/${c.door_image}`} alt="" loading="lazy" /></div>
              )}
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

      <div className="splash-words">
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
          {/* Back at the front door after real work this visit: a signoff line. */}
          {workedThisVisit() && <CoachSays portrait={null} line={signoffLine()} />}
        </div>
      ) : (
        <div className="placeholder">
          <b>Splash intro — awaiting BK</b>
          BK&rsquo;s own words. Not invented here.
        </div>
      )}

      </div>
    </div>
  )
}

// ============================================================
// COURSE DOOR — three lanes, peer to each other (ruling B)
// ============================================================
const LANES = [
  // BK, 2026-09-25. The gauges are front and center: a kid opens the course and
  // sees their skills. Tap a gauge, climb that skill's ladder (content from the
  // current unit). Units hold each unit's review brief and test practice.
  // "Review Activities" holds Review Bowl; the lane never says "game" so a
  // district filter has no reason to flag it. Regents Review is pulled until spring.
  { key: 'skills',        src: 'stations',      label: 'Your Skills',
    intro: 'Start here. Each gauge is one skill you’re graded on. Tap it to climb.' },
  { key: 'units',         src: 'units',         label: 'Units',
    // BK 2026-10-02 14:03 ("a. agreed b. yes"): Units holds FINISHED units only; the unit we're in lives on the door.
    intro: 'Units we’ve finished. Got a casefile back? Open the unit it came from and work its gauges there. Nothing in here closes.' },
  // BK, 2026-09-27 09:29: the U.S. door's fourth lane ("its own lane"); intro approved 10:25.
  // `optional`: a course without it (Global) shows no tab at all, not a dead one.
  { key: 'threads',       src: 'threads',       label: 'Threads', optional: true,
    intro: 'Seven questions America keeps asking. Follow a thread from unit to unit, and tap any stop to see what happened.' },
  // The Enduring Issues map: Global's counterpart to Threads (Leo 20:59; BK 21:38 "EI Map moves above case closed").
  // Lane name and intro proposed to BK 21:41.
  { key: 'issues',        src: 'issues',        label: 'Enduring Issues', optional: true,
    intro: 'Six issues the world keeps facing. Follow an issue from unit to unit, and tap any stop to see what happened.' },
  // The Atlas (Leo's order 10/5 21:07): both doors, after Threads. Lane name and intro, BK 21:11 ("yes to all three").
  { key: 'atlas',         src: 'atlas',         label: 'Atlas', optional: true,
    intro: ATLAS_WORDS.intro },
  // The Writing Lab (Blueprint, tool 1; BK signed the desks' words 22:46/22:48). Lane words proposed 22:57.
  { key: 'writing_lab',   src: 'writing_lab',   label: WL_WORDS.lane, optional: true, intro: WL_WORDS.intro },
  { key: 'skills_review', src: 'skills_review', label: 'Review Activities',
    intro: 'Practice that runs all year, covering everything taught so far.' },
]

function CourseDoor({ course, prog, games, docAssist, atlasMaps, onOpenMap, onOpenUnitAtlas, wlSets, onOpenSet, onOpenSkill, onOpenUnit, onOpenUnit0, onOpenDocAssist, onOpenActivity, onOpenReview, onBack, lane: laneIn, setLane }) {
  // The lane lives in App, so Back from a unit page lands on Units, not the gauges.
  const firstWithContent = LANES.find(l => (course[l.src] || []).length)?.key || 'skills'
  const lane = laneIn || firstWithContent
  // One scroll per screen: the welcome on arrival; once a kid taps a tab, that lane's own
  // line (the desk's lane_enter lines), if the course has one.
  const [touched, setTouched] = useState(false)
  const LANE_LINES = { skills: 'stations', units: 'units' }
  const laneLines = touched ? course.guide?.lines?.lane_enter?.[LANE_LINES[lane]] : null
  // The gauges follow the CURRENT unit (BK, 2026-09-25). Past units' gauges move
  // into their own page under Units, so the list grows as the year goes on.
  const unit = currentUnit(course)

  return (
    <div className="wrap">
      <ScreenHeader label={course.label} onBack={onBack} color={course.accent} back="The Arena" />

      <div className="lane-nav" role="tablist" aria-label="Lanes">
        {LANES.filter(l => !l.optional || course[l.src]).map(l => {
          const count = (course[l.src] || []).length
          const sel = lane === l.key
          return (
            <button
              key={l.key}
              role="tab"
              aria-selected={sel}
              disabled={!count}
              className="lane-tab"
              style={sel ? { background: course.accent, borderColor: course.accent } : undefined}
              onClick={() => { setTouched(true); setLane(l.key) }}
            >
              {l.label}
            </button>
          )
        })}
      </div>

      {/* Growth coaching (Leo's LOCKED bank, BK 10:11): welcome back only when this device
          holds real progress for this course; otherwise a first-visit line. */}
      {laneLines?.length
        ? <CoachSays key={`lane-${course.id}-${lane}`} portrait={course.guide?.portrait || 'images/arena/guide-bk.png'}
                     line={laneLines[Math.floor(Math.random() * laneLines.length)]} />
        : <CoachSays key={`door-${course.id}`} portrait={course.guide?.portrait || 'images/arena/guide-bk.png'}
                 line={welcomeLine(Object.entries(prog || {}).some(([k, v]) => k.startsWith(`${course.id}:`) && Object.values(v || {}).some(a => (a || []).length)),
                                   course.guide?.lines?.door_enter)} />}
      <p className="lane-intro">{LANES.find(l => l.key === lane)?.intro}</p>

      {lane === 'skills' && (
        !unit ? <EmptyLane what="Skills" /> : <>
          <p className="unit-now"><span className="unit-now-tag">Now</span> {unitName(unit)}</p>
          <p className="unit-here">{UNIT_WORDS.here}</p>
          <SkillGauges course={course} unit={unit} prog={prog} onOpen={code => onOpenSkill(unit.slug, code)} />
          <div className="door-room">
            <RoomParts unit={unit} games={games} docAssist={docAssist} maps={mapsForUnit(atlasMaps, unit)} onOpenMap={onOpenMap}
                       wl={(wlSets || []).filter(s => String(s.entry.unit) === String(unit.number))} onOpenSet={onOpenSet}
                       onOpenDocAssist={onOpenDocAssist} onOpenActivity={onOpenActivity} onOpenReview={onOpenReview} />
          </div>
          {finishedUnits(course).length > 0 && (
            <p className="unit-elsewhere">
              {UNIT_WORDS.elsewhere}{' '}
              <button type="button" className="link-btn" onClick={() => { setTouched(true); setLane('units'); window.scrollTo(0, 0) }}>{UNIT_WORDS.elsewhereLink}</button>.
            </p>
          )}
        </>
      )}
      {lane === 'units' && <UnitLane course={course} onOpen={onOpenUnit} onOpenUnit0={onOpenUnit0} />}
      {lane === 'threads' && <ThreadsLane course={course} maps={atlasMaps} onOpenMap={onOpenMap} />}
      {lane === 'writing_lab' && <WritingLabLane course={course} sets={wlSets} unitName={unitName} onOpen={onOpenSet} Empty={EmptyLane} />}
      {lane === 'issues' && <IssuesLane course={course} maps={atlasMaps} onOpenMap={onOpenMap} />}
      {lane === 'atlas' && <AtlasLane course={course} maps={atlasMaps} currentUnit={unit} unitName={unitName} onOpen={onOpenMap} onOpenUnitAtlas={onOpenUnitAtlas} Empty={EmptyLane} />}
      {lane === 'skills_review' && <SkillsReviewLane course={course} />}
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
      <BottomBack onBack={onBack} back={station.name} />
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
      <BottomBack onBack={onBack} back={course.label} />
    </div>
  )
}

// ── SKILLS REVIEW LANE ──────────────────────────────────────────────────────
// Each entry points OUT to a separately built game (scenario_link-shaped); the shell
// never absorbs one. An entry that is not open renders exactly the way §3 of the signed
// spec says a building surface must: darkened, carrying ONE SHORT WORD so the meaning is
// never colour alone, and — because a dead element a kid can tab into is a bug, not a
// state — as a plain div that is not in the tab order and cannot swallow a keypress.
function SkillsReviewLane({ course }) {
  const items = course.skills_review || []
  if (!items.length) return <EmptyLane what="Skills review" />
  return (
    <div className="grid">
      {items.map((it, i) => {
        const href = it.url || it.content_ref
        const open = isLive(it) && resolves(href)
        if (!open) {
          return (
            <div className="card off" key={it.slug || i}>
              <div className="card-type">Review activity</div>
              <div className="card-name">{it.label}</div>
              {it.blurb && <div className="card-blurb">{it.blurb}</div>}
              <span className="flag building">Under construction</span>
            </div>
          )
        }
        return (
          <a className="card" key={it.slug || i} href={href} target="_blank" rel="noopener noreferrer">
            <div className="card-type">Review activity</div>
            <div className="card-name">{it.label}</div>
            {it.blurb && <div className="card-blurb">{it.blurb}</div>}
            <span className="flag live">Open</span>
          </a>
        )
      })}
    </div>
  )
}

// THE RIGHT ROOM (BK 2026-10-02 13:30 / 14:03): "whole goal is for them to be working in the right
// area." The unit we're in lives on the door (gauges, then its Review, Doc Assist and Test practice);
// a unit slides into Units once the next one opens. Every name carries the number on the casefile.
const UNIT_WORDS = {
  here: 'This is the unit we’re in now. Gauge work for it goes here.',
  elsewhere: 'Got a casefile back from an earlier unit? Its gauges are in',
  elsewhereLink: 'Units',
  finished: name => `You’re in ${name}, a finished unit. Working on the unit we’re in now?`,
  goNow: n => `Go to ${n} (now)`,
  skillsIn: n => `Your ${n} skills`,
}
export const unitNum = u => u?.number || (String(u?.label || '').match(/^\d+\.\d+/) || [])[0] || ''
export const unitName = u => {
  const n = unitNum(u), l = String(u?.label || '')
  return n && !l.startsWith(n) ? `${n} · ${l}` : l
}
const finishedUnits = course => {
  const now = currentUnit(course)?.slug
  return [...(course.units || [])].filter(u => u.slug !== now).reverse()   // newest first
}

// One unit's Review, Doc Assist and Test practice: in the unit's room, and for the unit
// we're in, on the door under its gauges.
function RoomParts({ unit, games, docAssist, maps, onOpenMap, wl, onOpenSet, onOpenDocAssist, onOpenActivity, onOpenReview }) {
  const acts = (unit.activities || []).filter(isLive)
  const asg = unit.assignment && unit.assignment.published !== false ? unit.assignment : null
  const asgGame = asg ? (games || []).find(g => g.id === asg.content_ref) : null
  const assignment = asg && asgGame?.status === 'live' && asgGame.url ? { ...asg, href: asgGame.url } : null
  return (
    <>
      {/* ROOM ORDER (BK, 2026-09-25): the unit's review, then its test practice. */}
      {(resolves(unit.brief_ref) || assignment) && (
        <>
          <h3 className="room-section">Review</h3>
          <div className="grid room-cards" style={{ marginBottom: 34 }}>
            {resolves(unit.brief_ref) && (
              <button type="button" className="card" onClick={onOpenReview}>
                <div className="card-type">Unit review</div>
                <div className="card-name">What this unit covered</div>
                <div className="card-blurb">The key facts, the big idea, and a quick check.</div>
                <span className="flag live">Open</span>
              </button>
            )}
            {/* A classroom assignment (BK, 2026-09-28): a game the class plays in a period, beside
                the unit review. Its words come from the manifest; its link resolves through
                games.json, so it only lights when the game is live. */}
            {assignment && (
              <a className="card assignment" href={assignment.href} target="_blank" rel="noopener noreferrer">
                <div className="card-type">{assignment.type_label}</div>
                <div className="card-name">{assignment.title}</div>
                <div className="card-blurb">{assignment.blurb}</div>
                <span className="flag live">Open</span>
              </a>
            )}
          </div>
        </>
      )}
      {/* DOC ASSIST (BK 2026-10-01 08:16): every casefile document, with a walk-through
          beside it, organized Casefile A · B · C. Lights only when the unit's pack loads. */}
      {docAssist && (
        <>
          <h3 className="room-section">{DA.section}</h3>
          <div className="grid room-cards" style={{ marginBottom: 34 }}>
            <DocAssistCard pack={docAssist} onOpen={onOpenDocAssist} />
          </div>
        </>
      )}
      {/* THE WRITING LAB (Blueprint, 10/5): this unit's sets. */}
      {wl?.length > 0 && (
        <>
          <h3 className="room-section">{WL_WORDS.lane}</h3>
          <div style={{ marginBottom: 34 }}><WritingLabCards sets={wl} onOpen={onOpenSet} /></div>
        </>
      )}
      {/* MAPS (the Atlas, 10/5): this unit's maps, the same cards the Atlas lane shows. */}
      {maps?.length > 0 && (
        <>
          <h3 className="room-section">{ATLAS_WORDS.section}</h3>
          <div style={{ marginBottom: 34 }}><MapCards maps={maps} onOpen={onOpenMap} /></div>
        </>
      )}
      <h3 className="room-section">Test practice</h3>
      {!acts.length
        ? <EmptyLane what="Activities" />
        : <TestPractice unit={unit} acts={acts} games={games} onOpenActivity={onOpenActivity} />}
    </>
  )
}

function UnitLane({ course, onOpen, onOpenUnit0 }) {
  const units = finishedUnits(course)
  if (!units.length && !course.unit0?.published) return <EmptyLane what="Unit rooms" />
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
            <div className="card-name">{unitName(u)}</div>
            <div className="card-blurb">
              {n ? `${n} ${n === 1 ? 'activity' : 'activities'}` : 'Nothing published yet'}
            </div>
            {on
              ? <span className="flag live">Open</span>
              : <span className="flag building">Under construction</span>}
          </button>
        )
      })}
      {/* Unit 0, the oldest: the six skills outside a history class (Leo's order 10/3). */}
      <Unit0Card course={course} onOpen={onOpenUnit0} />
    </div>
  )
}

function UnitRoom({ course, unit, games, prog, docAssist, atlasMaps, onOpenMap, wlSets, onOpenSet, onOpenDocAssist, onOpenActivity, onOpenSkill, onOpenReview, onBack, onGoNow }) {
  const now = currentUnit(course)
  const isCurrent = now?.slug === unit.slug
  return (
    <div className="wrap">
      <ScreenHeader label={unitName(unit)} onBack={onBack} color={course.accent} back={course.label} />
      {/* A finished unit says so at the top, with the way back to the unit we're in (BK 14:03). */}
      {!isCurrent && now && (
        <div className="unit-finished" role="note">
          <p>{UNIT_WORDS.finished(unitName(unit))}</p>
          <button type="button" className="btn-now" onClick={onGoNow}>{UNIT_WORDS.goNow(unitNum(now) || now.label)}</button>
        </div>
      )}
      {/* Gauges first, as on the door: a casefile back is why a kid is in here (Josh, 2026-10-02).
          A past unit's room shows only the gauges that unit actually built: an empty
          ladder in a room kids revisit is exactly the "empty" BK ruled out (17:19). */}
      {!isCurrent && roomSkills(course, unit).some(s => s.ladder) && (
        <>
          <h3 className="room-section" >{unitNum(unit) ? UNIT_WORDS.skillsIn(unitNum(unit)) : 'Your skills in this unit'}</h3>
          <SkillGauges course={course} unit={unit} prog={prog} onOpen={onOpenSkill} builtOnly />
          <div className="door-room" />
        </>
      )}
      <RoomParts unit={unit} games={games} docAssist={docAssist} maps={mapsForUnit(atlasMaps, unit)} onOpenMap={onOpenMap}
                 wl={(wlSets || []).filter(s => String(s.entry.unit) === String(unit.number))} onOpenSet={onOpenSet}
                 onOpenDocAssist={onOpenDocAssist} onOpenActivity={onOpenActivity} onOpenReview={onOpenReview} />
      <BottomBack onBack={onBack} back={course.label} />
    </div>
  )
}

// Test practice, grouped so a kid can scan it. A unit activity that is already a
// ladder level (e.g. HC L1 matching) is left out here — it lives on the ladder.
const PRACTICE_GROUPS = [
  { key: 'regents', label: 'Regents-style questions', test: a => a.type === 'stimulus' || a.type === 'doc_check' },
  { key: 'vocab',   label: 'Vocabulary',              test: a => a.type === 'matching' && /vocab/i.test(a.content_ref || '') },
  { key: 'moves',   label: 'Thinking moves',          test: a => a.type === 'matching' },
  { key: 'more',    label: 'More',                    test: () => true },
]
function TestPractice({ unit, acts, games, onOpenActivity }) {
  const onLadder = new Set((unit.ladders || []).flatMap(l => (l.levels || []).map(lv => lv.content_ref)).filter(Boolean))
  const rows = acts.map((a, i) => ({ a, i })).filter(({ a }) => !onLadder.has(a.content_ref))
  const groups = PRACTICE_GROUPS.map(g => ({ ...g, rows: [] }))
  for (const r of rows) groups.find(g => g.test(r.a)).rows.push(r)
  const gameFor = ref => (games || []).find(g => g.id === ref) || null
  return (
    <div className="practice">
      {groups.filter(g => g.rows.length).map(g => (
        <section key={g.key} className="practice-group">
          <h4 className="practice-head">{g.label}</h4>
          <div className="practice-rows">
            {g.rows.map(({ a, i }) => {
              if (a.type === 'scenario_link') {
                const game = gameFor(a.content_ref)
                const href = game?.status === 'live' ? game.url : (/^https?:/.test(a.content_ref || '') ? a.content_ref : null)
                return href
                  ? <a key={i} className="practice-row" href={href} target="_blank" rel="noopener noreferrer">
                      <span>{a.label}</span><span className="flag live">Open</span></a>
                  : <div key={i} className="practice-row off"><span>{a.label}</span><span className="flag soon">Coming</span></div>
              }
              const playable = a.type === 'stimulus' || a.type === 'matching' || a.type === 'doc_check'
              return playable
                ? <button key={i} type="button" className="practice-row" onClick={() => onOpenActivity(i)}>
                    <span>{a.label}{a.blurb && <span className="row-blurb">{a.blurb}</span>}</span><span className="flag live">Start</span></button>
                : <div key={i} className="practice-row off"><span>{a.label}</span><span className="flag soon">Coming</span></div>
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

function EmptyLane({ what }) {
  return (
    <div className="empty">
      <div className="empty-title">Not open yet.</div>
      <p>This room fills in as the unit gets taught. Check back once you've covered it in class.</p>
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
  const table = tableOf(doc) || parsePipeTable(doc.content)
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
  const [shown, setShown] = useState(0)   // hints opened (optional per item; Will's 10.2 pack carries two)
  const hints = item.hints || []
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
      {item.document && <div className="doc-tag">{item.document}</div>}
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
      {!answered && hints.length > 0 && (
        <div className="hints">
          {hints.slice(0, shown).map((h, i) => <p key={i} className="hint"><b>Hint {i + 1}</b> {h}</p>)}
          {shown < hints.length && (
            <button type="button" className="btn-ghost" onClick={() => setShown(x => x + 1)}>
              {shown === 0 ? 'Show a hint' : 'Show the second hint'}
            </button>
          )}
        </div>
      )}
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

// RULED 2026-09-26 (BK, to Josh) — best run REMOVED. It supersedes the 09-18 ruling
// (BK, via Sam) that added it. BK: "Remove it. I agree that is where the coaching
// lives." On a ten-question set, "10 in a row" reads as 10 out of 10: a grade-shaped
// number, against the no-grade rule Will set for test practice. What stays is reps:
// every attempt this session, right or wrong. It only goes up and it is SESSION-SCOPED,
// with no storage at all, so it is gone when the tab closes (canon §1).
// The space below the set is held for growth coaching (PBIS-style: celebrate growth,
// connect the skill to the kid's world). Leo works that with BK, with Sam's and
// Will's input. Josh builds the slot; the words are not Josh's.
// Do not reintroduce a streak, a percentage or a count of right answers here.
function Counters({ reps }) {
  if (!reps) return null
  return (
    <div className="counters" role="status" aria-live="polite">
      <span className="counter"><b>{reps}</b> {reps === 1 ? 'rep' : 'reps'} this session</span>
    </div>
  )
}

function ItemSet({ pack, course, heading }) {
  const items = (pack && pack.items) || []
  const [reps, setReps] = useState(0)
  const [stuck, noteStuck] = useStuck()
  const record = (ok, i) => { setReps(r => r + 1); noteStuck(ok, i) }
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
        <div key={it.n ?? i}>
          <McItem item={it} accent={course.accent} course={course}
                  n={i + 1} total={items.length} onAnswer={ok => record(ok, i)} />
          {stuck && stuck.at === i && <CoachSays portrait={course.guide?.portrait || BK_PORTRAIT} line={stuck.line} />}
        </div>
      ))}
      <Counters reps={reps} />
    </>
  )
}

// ============================================================
// MATCHING — pair them up, then defend one pairing.
// Second mechanic built (first was stimulus, v2). Same laws: nothing scored,
// nothing saved, nothing sent anywhere. Click-to-select then click-to-pair —
// never drag-and-drop, because a kid on a trackpad or a keyboard-only reader
// gets the same activity a kid with a mouse gets (accessibility floor).
//
// content_ref pack shape, for the authoring desk cutting one:
//   {
//     "intro": "optional override of the stock instruction line",
//     "left":  [{ "key": "a", "label": "..." }, ...],
//     "right": [{ "key": "1", "label": "..." }, ...],   // right column is shuffled on render
//     "correct":   { "a": "1", "b": "3", ... },          // leftKey -> rightKey
//     "rationale": { "a": "why this pair, shown after the student defends it" }
//   }
// Counts don't have to match 1:1, but the "pair them all" gate requires every
// LEFT item paired before checking — a right item can be left unused.
// ============================================================
function shuffle(arr) {
  // Per-mount only — there is no saved state to keep consistent across a
  // reload, and the point is making pairing a real choice, not left-to-right reading.
  const a = (arr || []).slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function MatchingSet({ pack, accent, onChecked }) {
  const left = pack.left || []
  const right = pack.right || []
  const rightShuffled = useMemo(() => shuffle(right), [pack])
  const correct = pack.correct || {}
  const rationale = pack.rationale || {}

  const [selectedLeft, setSelectedLeft] = useState(null)
  const [pairs, setPairs] = useState({})   // leftKey -> rightKey
  const [checked, setChecked] = useState(false)
  const [defendKey, setDefendKey] = useState(null)
  const [defenseText, setDefenseText] = useState('')
  const [defenseRevealed, setDefenseRevealed] = useState(false)
  // Three or more pairs off at the check reads as stuck: the stuck line, once.
  const [stuck, , retryStuck] = useStuck()

  // A right key is NOT consumed on pairing — the desk's own spec (Josh, 09-19)
  // says counts don't have to be 1:1, and Will's first real pack uses that on
  // purpose (Qing China and Tokugawa Japan both correctly pair to East Asia).
  // Locking a right tile after one use would make half his content unpairable.
  const allPaired = left.length > 0 && left.every(l => pairs[l.key])

  const pickLeft = key => { if (!checked) setSelectedLeft(cur => cur === key ? null : key) }
  const pickRight = key => {
    if (checked || !selectedLeft) return
    setPairs(p => ({ ...p, [selectedLeft]: key }))
    setSelectedLeft(null)
  }
  const unpair = leftKey => {
    if (checked) return
    setPairs(p => { const n = { ...p }; delete n[leftKey]; return n })
  }
  const rightLabel = key => (right.find(r => r.key === key) || {}).label || key

  const MIN = 20
  const defenseReady = defenseText.trim().length >= MIN

  return (
    <div className="matching">
      <p className="mc-preamble">
        {pack.intro || 'Pick one on the left, then its match on the right. Nothing here is scored or saved — pair your best guess, then check.'}
      </p>

      <div className="match-cols">
        <div className="match-col">
          {left.map(l => {
            const isPaired = !!pairs[l.key]
            let cls = 'mc-choice'
            if (selectedLeft === l.key) cls += ' selected'
            if (checked) cls += (correct[l.key] === pairs[l.key]) ? ' correct' : ' incorrect'
            else if (isPaired) cls += ' paired'
            return (
              <button key={l.key} type="button" className={cls} disabled={checked}
                      onClick={() => isPaired ? unpair(l.key) : pickLeft(l.key)}>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                  <span>{l.label}</span>
                  {isPaired && !checked && <span className="match-tag">Paired &mdash; tap to redo</span>}
                </span>
                {checked && (correct[l.key] === pairs[l.key]
                  ? <em className="mc-mark">Correct</em>
                  : <em className="mc-mark">Not this one</em>)}
              </button>
            )
          })}
        </div>
        <div className="match-col">
          {rightShuffled.map(r => {
            // usedCount is display only — a right tile stays clickable no matter
            // how many left items already point to it.
            const usedCount = Object.values(pairs).filter(v => v === r.key).length
            // No .paired dimming here — unlike a left tile, a right tile is never
            // "used up." Dimming it would read as disabled when it's still a live target.
            return (
              <button key={r.key} type="button" className="mc-choice"
                      disabled={checked || !selectedLeft}
                      onClick={() => pickRight(r.key)}>
                <span>{r.label}</span>
                {usedCount > 1 && !checked && <span className="match-tag">{usedCount} paired here</span>}
              </button>
            )
          })}
        </div>
      </div>

      {!checked ? (
        <>
          <button className="rep-go" disabled={!allPaired}
                  onClick={() => {
                    setChecked(true)
                    if (left.filter(l => correct[l.key] !== pairs[l.key]).length >= 3) retryStuck()
                    onChecked && onChecked()
                  }}>
            {allPaired ? 'Check my pairs'
                       : `Pair them all first — ${left.length - Object.keys(pairs).length} to go`}
          </button>
          {/* The gate is the mechanic, not friction — same law as the stimulus rep. */}
          <p className="rep-why">Every one gets paired before any of them gets checked —
             no picking off the easy ones first.</p>
        </>
      ) : (
        <div className="rep-reveal">
          {stuck && <CoachSays portrait={BK_PORTRAIT} line={stuck.line} />}
          <h4>Now defend one</h4>
          <p className="mc-preamble">Pick one of your pairs — right or wrong — and say why it
             goes together. A wrong pair is fair game; explaining why you picked it teaches
             as much as explaining a right one.</p>
          <div className="mc-choices">
            {left.filter(l => pairs[l.key]).map(l => (
              <button key={l.key} type="button"
                      className={`mc-choice${defendKey === l.key ? ' selected' : ''}`}
                      onClick={() => { setDefendKey(l.key); setDefenseRevealed(false); setDefenseText('') }}>
                <b>{l.label}</b> <span>&rarr; {rightLabel(pairs[l.key])}</span>
              </button>
            ))}
          </div>

          {defendKey && (
            <>
              <label className="rep-label" htmlFor="match-defense">Your defense</label>
              <textarea id="match-defense" className="rep-box" rows={4} value={defenseText}
                onChange={e => setDefenseText(e.target.value)}
                placeholder="Why does this pair go together? Nothing here is saved or scored." />
              {!defenseRevealed ? (
                <button className="rep-go" disabled={!defenseReady}
                        onClick={() => setDefenseRevealed(true)}>
                  {defenseReady ? 'Show me the reasoning'
                                : `Write a bit more first — ${Math.max(0, MIN - defenseText.trim().length)} characters to go`}
                </button>
              ) : (
                <div className="rep-reveal">
                  <h4>The reasoning</h4>
                  <p className="rep-exemplar">
                    {rationale[defendKey] || 'No rationale written for this pair yet.'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function MatchingActivity({ course, activity, pack, onBack }) {
  return (
    <div className="wrap">
      <ScreenHeader label={activity.label} onBack={onBack} color={course.accent} back="Back" />
      <div className="detail" style={{ maxWidth: 760 }}>
        {!pack || !(pack.left || []).length
          ? <div className="empty" style={{ textAlign: 'left' }}>
              <div className="empty-title">This set has no pairs yet</div>
              <p>The mechanic is built. Its pairs arrive by reference from the desk that
                 owns this course, as a matching pack named in <code>content_ref</code>.</p>
            </div>
          : <MatchingSet pack={pack} accent={course.accent} />}
      </div>
      <BottomBack onBack={onBack} back={'Back'} />
    </div>
  )
}

// THE DOC CHECK (2026-09-30): test practice with a proof step. The set lives in doccheck.jsx;
// this wrapper gives it the room's header, the reps counter, the stuck line and both Backs.
function DocCheckActivity({ course, activity, pack, onBack }) {
  const [reps, setReps] = useState(0)
  const [stuck, noteStuck] = useStuck()
  const Coach = ({ at }) => (stuck && stuck.at === at
    ? <CoachSays portrait={course.guide?.portrait || BK_PORTRAIT} line={stuck.line} /> : null)
  return (
    <div className="wrap">
      <ScreenHeader label={activity.label} onBack={onBack} color={course.accent} back="Back" />
      <div className="detail" style={{ maxWidth: 1040 }}>
        {!pack || !(pack.items || []).length
          ? <div className="loading">Opening the set&hellip;</div>
          : <DocCheckSet pack={pack} accent={course.accent} Coach={Coach}
                         onAnswer={(ok, i) => { setReps(r => r + 1); noteStuck(ok, i) }} />}
        <Counters reps={reps} />
      </div>
      <BottomBack onBack={onBack} back={'Back'} />
    </div>
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
      <BottomBack onBack={onBack} back={'Back'} />
    </div>
  )
}

// The same Back, at the bottom of the page (BK, 2026-09-25): a kid who has
// scrolled through ten questions should not have to scroll back up to leave.
function BottomBack({ onBack, back }) {
  return (
    <div className="bottom-back">
      <button type="button" className="bottom-back-btn" onClick={() => { onBack(); window.scrollTo(0, 0) }}>&larr; Back to {back === 'Back' ? 'the unit' : back}</button>
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

// Under each ladder: the skill's own card (what it is) and its station drills as
// "More reps", so nothing that lived in the old Skill Stations lane goes missing.
function SkillExtras({ course, skill, onOpenDrill }) {
  const st = (course.stations || []).find(s => (s.skill_lines || [])[0] === skill)
  if (!st) return null
  const drills = (st.drills || []).map((d, i) => ({ d, i })).filter(({ d }) => d.published && !VOCAB_HELD.has(drillGuideKey(d)))
  return (
    <div className="detail" style={{ maxWidth: 820, marginTop: 30 }}>
      {st.blurb && <p className="skill-about">{st.blurb}</p>}
      {drills.length > 0 && <>
        <h3 className="room-section">More reps</h3>
        <div className="practice-rows">
          {drills.map(({ d, i }) => (
            <button key={i} type="button" className="practice-row" onClick={() => onOpenDrill(st.slug, i)}>
              <span>{d.name || d.label}</span><span className="flag live">Start</span>
            </button>
          ))}
        </div>
      </>}
    </div>
  )
}

// ============================================================
// LADDER LEVEL — one screen, five activity types. The renderer is picked by
// the manifest's `type`; the content arrives by reference, like everything else.
// ============================================================
function LevelScreen({ course, skillName, lv, pack, source, prevTop = 0, onComplete: markComplete, onBack }) {
  const t = LEVEL_TYPES[lv?.type]
  // A set finished: count it for this visit (memory only), and pick the coaching line now,
  // while we still know whether this finish moved the gauge.
  const [coachLine, setCoachLine] = useState(null)
  const onComplete = (...a) => {
    if (!coachLine) {
      const reps = (pack?.items || pack?.pairs || pack?.left || []).length || 1
      noteSetDone(reps)
      setCoachLine(setDoneLine({ gaugeMoved: (lv?.level || 0) > prevTop }))
    }
    return markComplete(...a)
  }
  let body
  if (pack === null) body = <div className="loading">Opening&hellip;</div>
  else if (!pack) body = (
    <div className="empty" style={{ textAlign: 'left' }}>
      <div className="empty-title">This step didn&rsquo;t load</div>
      <p>Go back and try it again. If it still won&rsquo;t open, tell your teacher which step it was.</p>
    </div>
  )
  else if (lv.type === 'matching') body = <MatchingSet pack={pack} accent={course.accent} onChecked={onComplete} />
  else if (lv.type === 'mc_bestfit') body = <BestFit pack={pack} onComplete={onComplete} Stimulus={StimulusBlock} accent={course.accent} />
  else if (lv.type === 'sentence_build') body = <SentenceBuild pack={pack} onComplete={onComplete} />
  else if (lv.type === 'guided_write') body = <GuidedWrite pack={pack} accent={course.accent} onComplete={onComplete} />
  else if (lv.type === 'enrichment') body = <>
    {source?.source_text && (
      <figure className="stimulus" style={{ borderColor: `${course.accent}44` }}>
        {source.source_document && <div className="doc-tag">{source.source_document}</div>}
        <div className="stimulus-text"><p>{source.source_text}</p></div>
      </figure>
    )}
    <Enrichment pack={pack} onComplete={onComplete} />
  </>
  else body = <EmptyLane what="This step" />
  return (
    <div className="wrap">
      <ScreenHeader label={skillName} onBack={onBack} color={course.accent} back={skillName} />
      <div className="detail" style={{ maxWidth: 860 }}>
        <div className="card-type">Step {lv?.level}{t ? ` · ${t.name}` : ''}</div>
        <h2>{lv?.label || t?.name}</h2>
        {body}
        {coachLine && <CoachSays key={coachLine} portrait={course.guide?.portrait || 'images/arena/guide-bk.png'} line={coachLine} />}
      </div>
      <BottomBack onBack={onBack} back={skillName} />
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
  // Ladder navigation. Skill is a skill-line CODE (HC, TH…); level is 1–5.
  const [skill, setSkill] = useState(null)
  const [level, setLevel] = useState(null)
  const [levelPack, setLevelPack] = useState(null)
  const [levelSource, setLevelSource] = useState(null)   // undefined-while-loading is `null`; a failed fetch is `false`
  const [review, setReview] = useState(false)
  const [daPack, setDaPack] = useState(null)          // the unit's Doc Assist pack; false = none or failed
  const [daOpen, setDaOpen] = useState(false)
  const [daDoc, setDaDoc] = useState(null)             // { cf, i } — a casefile id and a document index
  const [briefPack, setBriefPack] = useState(null)
  const [prog, markDone] = useProgress()
  const [ladderFrom, setLadderFrom] = useState('door')      // where Back from a ladder goes
  const [roomFrom, setRoomFrom] = useState('units')         // where Back from a review, Doc Assist or practice set goes
  const [drillFromLadder, setDrillFromLadder] = useState(false)
  const [doorLane, setDoorLane] = useState(null)
  const [office, setOffice] = useState(false)
  const [officeTheme, setOfficeTheme] = useState(null)
  const [officePack, setOfficePack] = useState(null)
  const [unit0, setUnit0] = useState(false)
  const [u0Pack, setU0Pack] = useState(null)
  const [u0Culture, setU0Culture] = useState(null)
  // DEEP LINKS (Leo's order 10/2; scheme in deeplinks.js). A link is applied once the manifest
  // is in, and again whenever the hash changes; a casefile or document waits for its pack.
  const linked = useRef(false)
  const [pendingDa, setPendingDa] = useState(null)      // { cf, docN } waiting on the Doc Assist pack
  const daPackFor = useRef(null)
  const [daCfFocus, setDaCfFocus] = useState(null)       // a casefile link's casefile, kept in the address bar                          // which content_ref the loaded Doc Assist pack is

  useEffect(() => {
    fetch(MANIFEST_URL)
      .then(r => { if (!r.ok) throw new Error(`manifest ${r.status}`); return r.json() })
      .then(m => { setCoachBank(m?.coaching); setManifest(m) })
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
  // The Atlas: this course's maps, and the one open in the viewer (by its id; it lives in links).
  const atlasMaps = useAtlas(course)
  const [atlasId, setAtlasId] = useState(null)
  const [unitAtlas, setUnitAtlas] = useState(false)      // one unit's atlas page (#/us/11.1/atlas)
  // The Writing Lab: this course's sets, and the one open (by its slug; it lives in links).
  const wlSets = useWritingLab(course)
  // The pop-up lists (Six Umbrellas / Civic Principles / Threads), for every screen that names one (BK 22:59).
  const refs = useRefCards(course)
  const [wlSlug, setWlSlug] = useState(null)
  const wlSet = (wlSets || []).find(s => s.entry.slug === wlSlug) || null
  const atlasMap = (atlasMaps || []).find(m => m.id === atlasId) || null

  const fetchContent = (ref, set) => {
    set(null)
    const r = String(ref).replace(/^content\//, '')
    fetch(`/content/${r}`).then(x => (x.ok ? x.json() : false)).then(set).catch(() => set(false))
  }
  const openLevel = n => {
    const s = roomSkills(course, unit).find(x => x.code === skill)
    const lv = ladderLevels(s?.ladder).find(l => l.level === n)
    if (!levelOpen(lv)) return
    setLevel(n); fetchContent(lv.content_ref, setLevelPack)
    // BK, 2026-09-25: a kid never works from a document they cannot see. L5 talks
    // about the ladder's source ("the 1705 law you just read"), so it carries the
    // same source box L4 shows, read from the ladder's own guided_write level.
    setLevelSource(null)
    const src = lv.type === 'enrichment' && ladderLevels(s?.ladder).find(l => l.type === 'guided_write' && levelOpen(l))
    if (src) fetchContent(src.content_ref, setLevelSource)
    window.scrollTo(0, 0)
  }
  // Doc Assist: the unit's pack loads with the room, so the card can carry the desk's own tile line.
  // On the door, the unit we're in carries its own Doc Assist card (BK 14:03), so its pack loads there too.
  const daUnit = unit || (course ? currentUnit(course) : null)
  const daRef = daUnit?.doc_assist && isLive(daUnit.doc_assist) && resolves(daUnit.doc_assist.content_ref) ? daUnit.doc_assist.content_ref : null
  useEffect(() => {
    setDaOpen(false); setDaDoc(null)
    if (daRef) { setDaPack(null); daPackFor.current = null; fetchContent(daRef, p => { if (p !== null) daPackFor.current = daRef; setDaPack(p) }) } else setDaPack(false)
  }, [daRef])
  useEffect(() => {
    if (!unit0 || !course?.unit0) return
    fetchContent(course.unit0.content_ref, setU0Pack)
    if (course.unit0.culture_ref) fetchContent(course.unit0.culture_ref, setU0Culture); else setU0Culture(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit0, course])
  const openReview = (u = unit) => { setReview(true); fetchContent(u.brief_ref, setBriefPack); window.scrollTo(0, 0) }
  const openActivity = (u, i) => {
    const a = (u.activities || []).filter(isLive)[i]
    setActIndex(i); setPack(null)
    if (resolves(a?.content_ref)) {
      // Same defensive strip as the station/drill fetchers below —
      // a content_ref is written both ways across the manifest
      // ("content/x.json" and bare "x.json"); doubling the prefix
      // was a silent 404 no one had hit until 11.1 went live today.
      const ref = a.content_ref.replace(/^content\//, '')
      fetch(`/content/${ref}`)
        .then(r => r.ok ? r.json() : null).then(setPack).catch(() => setPack(null))
    }
  }
  const applyRoute = r => {
    setStationSlug(null); setDrillIndex(null); setSkill(null); setLevel(null); setLevelPack(null)
    setReview(false); setBriefPack(null); setDaOpen(false); setDaDoc(null); setPendingDa(null)
    setActIndex(null); setPack(null); setUnit0(false); setOfficeTheme(null); setOfficePack(null)
    setUnitAtlas(r.at === 'unitatlas')
    setWlSlug(r.wlSet || null)
    setOffice(r.at === 'office')
    if (r.at === 'office') {
      if (r.theme) {
        const t = visibleThemes(manifest.office, PREVIEW_OFFICE).find(x => x.slug === r.theme)
        if (t) { setOfficeTheme(t.slug); fetchContent(t.content_ref, setOfficePack) }
      }
      setCourseId(null); setUnitSlug(null); window.scrollTo(0, 0); return
    }
    setCourseId(r.courseId || null)
    setDoorLane(r.lane || null)
    setAtlasId(r.atlasMap || null)
    setUnitSlug(r.unitSlug || null)
    setRoomFrom('units')
    if (r.at === 'unit0') setUnit0(true)
    if (r.at === 'review') { const u = (manifest.courses.find(c => c.id === r.courseId)?.units || []).find(x => x.slug === r.unitSlug); if (u) { setReview(true); fetchContent(u.brief_ref, setBriefPack) } }
    if (r.at === 'docassist') setPendingDa({ cf: r.cf || null, docN: r.docN ?? null })
    window.scrollTo(0, 0)
  }
  useEffect(() => {
    if (!manifest) return
    if (!linked.current) { linked.current = true; if (location.hash) applyRoute(parseHash(location.hash, manifest)) }
    const on = () => applyRoute(parseHash(location.hash, manifest))
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manifest])
  // A casefile or document link: once the unit's Doc Assist pack is in, open the document, or
  // scroll the casefile into view. A casefile or number that doesn't exist leaves Doc Assist open.
  useEffect(() => {
    if (!pendingDa || daPack === null || daPackFor.current !== daRef) return
    setPendingDa(null)
    if (!daPack) return                                   // no Doc Assist in this unit: the room stays
    setDaOpen(true)
    const cf = pendingDa.cf ? openCasefiles(daPack).find(c => String(c.id).toUpperCase() === pendingDa.cf) : null
    if (!cf) return
    const i = pendingDa.docN != null ? (cf.docs || []).findIndex(d => String(d.n).toLowerCase() === String(pendingDa.docN)) : -1
    if (i >= 0) { setDaDoc({ cf: cf.id, i }); window.scrollTo(0, 0); return }
    setDaCfFocus(cf.id)
    requestAnimationFrame(() => document.getElementById(`da-cf-${cf.id}`)?.scrollIntoView({ block: 'start' }))
  }, [pendingDa, daPack, daRef])
  // Where the student is now, written quietly to the address bar (no history entry, nothing sent).
  useEffect(() => {
    if (!manifest || !linked.current) return
    const daCf = daDoc && daPack ? openCasefiles(daPack).find(c => c.id === daDoc.cf) : null
    const h = buildHash({
      office: office && officeVisible(manifest.office, PREVIEW_OFFICE), officeTheme,
      course, unit0, unit, lane: doorLane, review, daOpen: daOpen && !!daPack, atlasMap: atlasMap?.id, unitAtlas, wlSet: wlSet?.entry.slug,
      daDoc: daCf ? { cf: daCf.id, n: daCf.docs?.[daDoc.i]?.n } : null,
      daCf: daOpen && !daDoc ? daCfFocus : null,
    })
    if (h !== location.hash && !(h === '' && !location.hash)) history.replaceState(null, '', h || location.pathname + location.search)
  }, [manifest, office, officeTheme, course, unit0, unit, doorLane, review, daOpen, daPack, daDoc, daCfFocus, atlasMap, unitAtlas, wlSet])
  useEffect(() => { if (!daOpen || daDoc) setDaCfFocus(null) }, [daOpen, daDoc])

  // Back from a review, Doc Assist or practice set opened on the door goes back to the door.
  const fromDoor = roomFrom === 'door'
  const leaveRoomPage = () => { if (fromDoor) setUnitSlug(null) }

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
  const officeOn = office && officeVisible(manifest.office, PREVIEW_OFFICE)
  const officeUi = { ScreenHeader, BottomBack, McItem }
  const officeThemes = officeOn ? visibleThemes(manifest.office, PREVIEW_OFFICE) : []
  const theme = officeOn && officeTheme ? officeThemes.find(t => t.slug === officeTheme) : null
  const openOfficeTheme = slug => {
    const t = officeThemes.find(x => x.slug === slug)
    if (!t) return
    setOfficeTheme(slug); fetchContent(t.content_ref, setOfficePack); window.scrollTo(0, 0)
  }
  if (officeOn && theme) {
    // key: a theme-to-theme jump (the back link) starts the new theme's path fresh.
    screen = <OfficeTheme key={theme.slug} office={manifest.office} theme={theme} themes={officeThemes}
                          pack={officePack} ui={officeUi} onOpenTheme={openOfficeTheme}
                          done={prog?.[`${OFFICE_COURSE.id}:${theme.slug}`]?.[OFFICE_SKILL] || []}
                          onDone={n => markDone(OFFICE_COURSE, officeUnit(theme), OFFICE_SKILL, n)}
                          onBack={() => { setOfficeTheme(null); setOfficePack(null); window.scrollTo(0, 0) }} />
  }
  else if (officeOn) {
    screen = <OfficeRoom office={manifest.office} preview={PREVIEW_OFFICE} ui={officeUi}
                         onOpenTheme={openOfficeTheme}
                         onBack={() => { setOffice(false); window.scrollTo(0, 0) }} />
  }
  else if (course && wlSet) {
    screen = <BlueprintScreen key={wlSet.entry.slug} course={course} set={wlSet} refs={refs} ScreenHeader={ScreenHeader} BottomBack={BottomBack}
                              onBack={() => { setWlSlug(null); setDoorLane(unitSlug ? doorLane : 'writing_lab'); window.scrollTo(0, 0) }} />
  }
  else if (course && unit && unitAtlas) {
    screen = <UnitAtlasPage course={course} unit={unit} maps={atlasMaps} onOpen={setAtlasId}
                            ScreenHeader={ScreenHeader} BottomBack={BottomBack} Empty={EmptyLane}
                            onBack={() => { setUnitAtlas(false); setUnitSlug(null); setDoorLane('atlas'); window.scrollTo(0, 0) }} />
  }
  else if (course && unit0 && course.unit0?.published) {
    screen = <Unit0Room key={`u0-${course.id}-${location.hash}`} course={course} pack={u0Pack} culture={u0Culture || null} ui={officeUi}
                        onBack={() => { setUnit0(false); setDoorLane('units'); window.scrollTo(0, 0) }} />
  }
  else if (!course) screen = <Splash manifest={manifest} onPick={id => { setCourseId(id); window.scrollTo(0, 0) }} onOffice={() => { setOffice(true); window.scrollTo(0, 0) }} />
  else if (station && drillIndex != null && (station.drills || [])[drillIndex]) {
    screen = <DrillScreen course={course} station={station} drill={station.drills[drillIndex]}
                          onBack={() => { setDrillIndex(null); if (drillFromLadder) { setStationSlug(null); setDrillFromLadder(false) } }} />
  }
  else if (station) screen = <StationScreen course={course} station={station}
                                            onOpenDrill={setDrillIndex}
                                            onBack={() => { setStationSlug(null); setDrillIndex(null) }} />
  else if (unit && skill && level != null) {
    const s = roomSkills(course, unit).find(x => x.code === skill)
    const lv = ladderLevels(s?.ladder).find(l => l.level === level)
    const prevTop = Math.max(0, ...levelsDone(prog, course, unit, skill))
    screen = <LevelScreen course={course} skillName={s?.name || skill} lv={lv} pack={levelPack} source={levelSource || null} prevTop={prevTop}
                          onComplete={() => markDone(course, unit, skill, level)}
                          onBack={() => { setLevel(null); setLevelPack(null) }} />
  }
  else if (unit && skill) {
    screen = (
      <div className="wrap">
        <ScreenHeader label={unit.label} color={course.accent}
                      onBack={() => { setSkill(null); if (ladderFrom === 'door') setUnitSlug(null) }}
                      back={ladderFrom === 'door' ? course.label : unit.label} />
        {/* The bank's line for this skill, plus the course desk's own station lines for it. */}
        <CoachSays key={`skill-${course.id}-${skill}`} portrait={course.guide?.portrait || 'images/arena/guide-bk.png'}
                   line={skillLine(skill, course.guide?.lines?.station_enter?.[(course.stations || []).find(x => (x.skill_lines || [])[0] === skill)?.slug] || [])} />
        <Ladder course={course} unit={unit} skill={skill} prog={prog} onOpenLevel={openLevel} />
        <SkillExtras course={course} skill={skill}
                     onOpenDrill={(slug, i) => { setStationSlug(slug); setDrillIndex(i); setDrillFromLadder(true); window.scrollTo(0, 0) }} />
        <BottomBack onBack={() => { setSkill(null); if (ladderFrom === 'door') setUnitSlug(null) }}
                    back={ladderFrom === 'door' ? course.label : unit.label} />
      </div>
    )
  }
  else if (unit && daOpen && daPack && daDoc) {
    const cf = openCasefiles(daPack).find(c => c.id === daDoc.cf)
    const doc = cf?.docs?.[daDoc.i]
    const go = i => { setDaDoc({ cf: daDoc.cf, i }); window.scrollTo(0, 0) }
    const back = () => { setDaDoc(null); window.scrollTo(0, 0) }
    screen = !doc ? null : (
      <div className="wrap">
        <ScreenHeader label={DA.docLabel(doc.n)} onBack={back} color={course.accent} back={DA.backTo(cf.id, cf)} />
        <DocAssistDoc pack={daPack} doc={doc} refs={refs} portrait={course.guide?.portrait || BK_PORTRAIT}
                      onPrev={daDoc.i > 0 ? () => go(daDoc.i - 1) : null}
                      onNext={daDoc.i < cf.docs.length - 1 ? () => go(daDoc.i + 1) : null} />
        <BottomBack onBack={back} back={DA.backTo(cf.id, cf)} />
      </div>
    )
  }
  else if (unit && daOpen && daPack) {
    const back = () => { setDaOpen(false); leaveRoomPage(); window.scrollTo(0, 0) }
    const backLabel = fromDoor ? course.label : unitName(unit)
    screen = (
      <div className="wrap">
        <ScreenHeader label={DA.section} onBack={back} color={course.accent} back={backLabel} />
        <DocAssistHome pack={daPack} onOpenDoc={(cf, i) => { setDaDoc({ cf, i }); window.scrollTo(0, 0) }} />
        <BottomBack onBack={back} back={backLabel} />
      </div>
    )
  }
  else if (unit && review) {
    screen = (
      <div className="wrap">
        <ScreenHeader label="Unit review" onBack={() => { setReview(false); setBriefPack(null); leaveRoomPage() }} color={course.accent} back={fromDoor ? course.label : unitName(unit)} />
        <div className="detail" style={{ maxWidth: 900 }}>
          <h2>{briefPack?.title || unit.label}</h2>
          {briefPack === null && <div className="loading">Opening the review&hellip;</div>}
          {briefPack === false && <EmptyLane what="Unit review" />}
          {briefPack && <UnitBrief brief={briefPack} />}
        </div>
        <BottomBack onBack={() => { setReview(false); setBriefPack(null); leaveRoomPage() }} back={fromDoor ? course.label : unitName(unit)} />
      </div>
    )
  }
  else if (unit && actIndex != null) {
    const act = (unit.activities || []).filter(isLive)[actIndex]
    const onActivityBack = () => { setActIndex(null); setPack(null); leaveRoomPage() }
    screen = act?.type === 'matching'
      ? <MatchingActivity course={course} activity={act} pack={pack} onBack={onActivityBack} />
      : act?.type === 'doc_check'
        ? <DocCheckActivity course={course} activity={act} pack={pack} onBack={onActivityBack} />
        : <StimulusActivity course={course} activity={act} pack={pack} onBack={onActivityBack} />
  }
  else if (unit) screen = <UnitRoom course={course} unit={unit} games={games} prog={prog}
                                    docAssist={daPack || null} atlasMaps={atlasMaps} onOpenMap={setAtlasId}
                                    wlSets={wlSets} onOpenSet={s => { setWlSlug(s); window.scrollTo(0, 0) }}
                                    onOpenDocAssist={() => { setRoomFrom('units'); setDaOpen(true); setDaDoc(null); window.scrollTo(0, 0) }}
                                    onOpenSkill={code => { setLadderFrom('unit'); setSkill(code); window.scrollTo(0, 0) }}
                                    onOpenReview={() => { setRoomFrom('units'); openReview(unit) }}
                                    onOpenActivity={i => { setRoomFrom('units'); openActivity(unit, i) }}
                                    onGoNow={() => { setUnitSlug(null); setSkill(null); setLevel(null); setReview(false); setDoorLane('skills'); window.scrollTo(0, 0) }}
                                    onBack={() => { setUnitSlug(null); setSkill(null); setLevel(null); setReview(false) }} />
  else screen = (
    <CourseDoor
      course={course}
      prog={prog}
      lane={doorLane}
      setLane={setDoorLane}
      onOpenSkill={(slug, code) => { setLadderFrom('door'); setUnitSlug(slug); setSkill(code); window.scrollTo(0, 0) }}
      onOpenUnit={slug => { setRoomFrom('units'); setUnitSlug(slug); setSkill(null); setLevel(null); setReview(false); window.scrollTo(0, 0) }}
      onOpenUnit0={() => { setUnit0(true); window.scrollTo(0, 0) }}
      games={games}
      docAssist={daPack || null}
      atlasMaps={atlasMaps}
      onOpenMap={setAtlasId}
      onOpenUnitAtlas={slug => { setUnitSlug(slug); setUnitAtlas(true); window.scrollTo(0, 0) }}
      wlSets={wlSets}
      onOpenSet={s => { setWlSlug(s); window.scrollTo(0, 0) }}
      onOpenDocAssist={() => { const u = currentUnit(course); setRoomFrom('door'); setUnitSlug(u.slug); setDaOpen(true); setDaDoc(null); window.scrollTo(0, 0) }}
      onOpenReview={() => { const u = currentUnit(course); setRoomFrom('door'); setUnitSlug(u.slug); openReview(u) }}
      onOpenActivity={i => { const u = currentUnit(course); setRoomFrom('door'); setUnitSlug(u.slug); openActivity(u, i) }}
      onBack={() => { setCourseId(null); setUnitSlug(null); setStationSlug(null); setDoorLane(null); setUnit0(false) }}
    />
  )

  return (
    <>
      <style>{STYLES + LADDER_STYLES + OFFICE_STYLES + THREADS_STYLES + DOCASSIST_STYLES + DOCCHECK_STYLES + UNIT0_STYLES + ATLAS_STYLES + ISSUES_STYLES + WRITINGLAB_STYLES + REF_STYLES}</style>
      {PREVIEW_OFFICE && !manifest.office?.published && (
        <div className="preview-banner" role="note">Preview: BK&rsquo;s Office is not live yet.</div>
      )}
      <div className={course ? 'app-interior' : undefined}>
        {screen}
        {course && atlasMap && <AtlasViewer key={atlasMap.id} map={atlasMap} refs={refs} onClose={() => setAtlasId(null)} />}
        <div className="wrap" style={{ paddingTop: 0, paddingBottom: 28 }}>
          <a href={HOME_URL} className="back-btn">
            &larr; flashpointhistory.com
          </a>
        </div>
      </div>
    </>
  )
}
