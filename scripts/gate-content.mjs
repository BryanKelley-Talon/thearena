#!/usr/bin/env node
// ============================================================
// CONTENT GATE — run before every build. Exits non-zero on a fail.
//   node scripts/gate-content.mjs
//
// Written 2026-09-18 after three findings from the authoring desks:
//   • Sam: his bank writes `alt`, this spec requires `image_alt`. Every crop he
//     owns would have failed on a key NAME. So: accept either, report the drift.
//   • Sam: "alt present" and "alt usable" are different tests, and his only ran
//     the first. "See unit01-nv-d1-join-or-die-1754.json — same engraving" is a
//     note to a human; a screen reader announces a filename. So: shape-test it.
//   • Will: text can be licensed too. The gate is per item and per source,
//     never per medium.
// A non-empty check is not a check. — Josh
// ============================================================
import fs from 'node:fs'
import path from 'node:path'

const CONTENT = path.resolve('public/content')

// THE GATE PROTECTS WHAT SHIPS. A dark station's package is not in front of a
// student, so a problem in it is a note for its desk, not a build failure.
// Live = the manifest says published AND its course is open.
const LIVE = new Set()
// Ladder files carry their own shapes (added 2026-09-25, Josh). The manifest says
// which type each one is, and the gate checks it against THAT type's contract.
const LADDER_TYPE = {}
const DOCASSIST = new Set()    // Doc Assist packs carry their own shape; the DOC ASSIST block below checks them
const ENRICH_OK = new Set()   // enrichment files whose ladder has an L4 source the shell shows above them
try {
  const m = JSON.parse(fs.readFileSync(path.resolve('public/arena.manifest.json'), 'utf8'))
  for (const c of m.courses || []) {
    if ((c.status ?? 'open') === 'building') continue
    for (const st of c.stations || []) if (st.published && st.content_ref) LIVE.add(String(st.content_ref).replace(/^content\//, ''))
    for (const u of c.units || []) {
      if (!u.published) continue
      for (const a of u.activities || []) if (a.published && a.content_ref) LIVE.add(String(a.content_ref).replace(/^content\//, ''))
      if (u.doc_assist?.content_ref) DOCASSIST.add(String(u.doc_assist.content_ref).replace(/^content\//, ''))
      if (u.brief_ref) {
        const f = String(u.brief_ref).replace(/^content\//, '')
        if (!fs.existsSync(path.join(CONTENT, f))) { console.error(`  FAIL  manifest\n        ${u.slug}: brief_ref '${f}' is not in public/content.`); process.exitCode = 1 }
        else { LADDER_TYPE[f] = 'unit_brief'; LIVE.add(f) }
      }
      for (const l of u.ladders || []) for (const lv of l.levels || []) {
        if (!lv.content_ref) continue
        const f = String(lv.content_ref).replace(/^content\//, '')
        if (!fs.existsSync(path.join(CONTENT, f))) {
          if (lv.published) { console.error(`  FAIL  manifest\n        ${u.slug} ${l.skill} L${lv.level}: content_ref '${f}' is not in public/content.`); process.exitCode = 1 }
          continue
        }
        if (lv.type !== 'matching') LADDER_TYPE[f] = lv.type
        if (lv.published) LIVE.add(f)
        if (lv.type === 'enrichment' && (l.levels || []).some(x => x.type === 'guided_write' && x.published)) ENRICH_OK.add(f)
      }
    }
  }
} catch { console.warn('  (no manifest read — treating every package as live)\n') }
const isLive = f => LIVE.size === 0 || LIVE.has(f)

let fails = 0, warns = 0
// A failure in a package that is not live is downgraded — reported, never blocking.
const fail = (f, m) => {
  if (!isLive(f)) { console.warn(`  dark  ${f}\n        ${m}`); warns++; return }
  console.error(`  FAIL  ${f}\n        ${m}`); fails++
}
const warn = (f, m) => { console.warn (`  warn  ${f}\n        ${m}`); warns++ }

function altShape(alt) {
  if (!alt || !String(alt).trim()) return 'empty'
  const a = String(alt).trim()
  if (/\.(json|png|jpe?g|webp|svg|pdf)\b/i.test(a)) return 'names a file — a screen reader would read the filename aloud'
  if (/^(see|ref|refer|same as|cf\.?)\b/i.test(a)) return 'is a cross-reference, not a description'
  if (/\b(TODO|TBD|FIXME|XXX)\b/i.test(a)) return 'is a placeholder'
  // Sam proposed "under about fifteen words is probably not alt text." PROBABLY
  // is the operative word: "Frank Beard cartoon depicting the Standard Oil
  // monopoly gripping smaller businesses" is eleven words and is real alt text.
  // Length is a SMELL, not a defect. Shape is a defect. So short → warn, and the
  // filename / cross-reference / TODO patterns → fail.
  if (a.split(/\s+/).length < 12) return { soft: `is ${a.split(/\s+/).length} words — short for an image description; check it describes rather than labels` }
  return null
}

function checkDoc(file, doc, where) {
  if (!doc || typeof doc !== 'object') return
  if (Array.isArray(doc.documents)) { doc.documents.forEach((d,i) => checkDoc(file, d, `${where}.documents[${i}]`)); return }
  const hasText = !!(doc.content && String(doc.content).trim())
  if (!doc.citation) fail(file, `${where}: no citation. Every document points to its record (canon 6).`)
  if (doc.image_ref) {
    const alt = doc.image_alt ?? doc.alt
    if (doc.alt && !doc.image_alt) warn(file, `${where}: carries 'alt' but not 'image_alt'. Both are read; the spec says image_alt.`)
    if (!alt) fail(file, `${where}: image_ref '${doc.image_ref}' with no alt text at all.`)
    else {
      const bad = altShape(alt)
      if (bad && bad.soft) warn(file, `${where}: alt ${bad.soft}`)
      else if (bad) fail(file, `${where}: alt ${bad}\n        -> ${JSON.stringify(String(alt).slice(0,90))}`)
    }
    const onDisk = fs.existsSync(path.join(CONTENT, doc.image_ref))
    if (!onDisk && !hasText) fail(file, `${where}: image_ref '${doc.image_ref}' not in public/content AND no transcription. A student would see nothing.`)
    if (!onDisk && hasText) warn(file, `${where}: image_ref '${doc.image_ref}' not served - renders from the transcription. Fine, but the scan is still gated.`)
  } else if (!hasText) {
    fail(file, `${where}: neither an image nor text. Empty stimulus.`)
  }
}

// One check per ladder type. Each one tests what the shell will actually read,
// so a missing key fails here instead of rendering as a blank box.
function checkLadder(f, d, type) {
  const need = (k, m) => { if (d[k] == null || (typeof d[k] === 'string' && !d[k].trim())) fail(f, m || `${type}: no '${k}'.`) }
  if (type === 'mc_bestfit') {
    for (const it of d.items || []) {
      const keys = Object.keys(it.options || {})
      if (keys.length < 2) fail(f, `${it.id}: fewer than two options.`)
      if (!keys.includes(String(it.correct))) fail(f, `${it.id}: correct '${it.correct}' matches no option.`)
      if (!(it.hints || []).length) warn(f, `${it.id}: no hints — the ladder offers two at L2.`)
    }
    if (!(d.items || []).length) fail(f, 'mc_bestfit: no items.')
  } else if (type === 'sentence_build') {
    const slots = String(d.sentence_frame || '').split('___').length - 1
    if (slots !== (d.blanks || []).length) fail(f, `sentence_build: frame has ${slots} blank(s), file has ${(d.blanks || []).length}.`)
    for (const b of d.blanks || []) {
      const n = (b.tiles || []).filter(t => t.correct === true).length
      if (n !== 1) fail(f, `blank ${b.blank_id}: ${n} correct tiles — must be exactly one.`)
    }
    need('correct_sentence')
  } else if (type === 'guided_write') {
    need('source_text'); need('prompt'); need('model_response', "guided_write: no 'model_response' — 'I'm done' would reveal nothing.")
    if (!(d.checklist || []).length) fail(f, 'guided_write: no checklist — it is the scaffold at L4.')
    if (!d.source_document) fail(f, 'guided_write: source text with no source_document pointer (canon 6, quotation provenance).')
  } else if (type === 'enrichment') {
    for (const t of d.tidbits || []) if (!t.source_pointer) fail(f, `tidbit ${t.id}: no source_pointer (canon 6, quotation provenance).`)
    for (const e of d.exemplars || []) if (![4, 5].includes(e.level)) fail(f, `exemplar level '${e.level}' — must be 4 or 5.`)
    if (!(d.tidbits || []).length && !(d.exemplars || []).length) fail(f, 'enrichment: no tidbits and no exemplars.')
  } else if (type === 'unit_brief') {
    if (!d.title) fail(f, 'unit_brief: no title.')
    if (!(d.key_facts?.rows || []).length) fail(f, 'unit_brief: no key_facts rows.')
    for (const [i, it] of (d.quick_check?.items || []).entries()) if (!it.q) fail(f, `quick_check ${i + 1}: no question.`)
    // No calendar dates in the Arena — unit dates live in Classroom (Sam, 2026-09-18).
    // Years are content; a month-and-day or a slash date is a schedule.
    const txt = JSON.stringify(Object.fromEntries(Object.entries(d).filter(([k]) => !k.startsWith('_'))))
    // Slash dates (9/28) read as a schedule: fail. Month-day can be history
    // ("July 14, 1789" in Will's 10.2 brief), so it only warns for a human look.
    const slash = txt.match(/\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/)
    if (slash) fail(f, `unit_brief: looks like a calendar date ('${slash[0]}'). Unit dates live in Classroom, never the Arena.`)
    const md = txt.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.? \d{1,2}\b(?!, ?1[0-9]{3})/)
    if (md) warn(f, `unit_brief: month-and-day with no historical year ('${md[0]}') — check it is not a class date.`)
  } else {
    fail(f, `ladder type '${type}' has no renderer in the shell.`)
  }
}

// BK, 2026-09-25: "not a fan of any task that requires a student to use a document
// that they dont see." Any live question or task that points at a document must
// carry that document on the same screen. Statements that merely mention one
// (an L5 tidbit citing Document 13) warn, so a human looks.
const DOC_RX = /\b(this|the|these|both|each|above|following)\s+(document|documents|source|sources|passage|excerpt|chart|map|cartoon|graph|table|image|images|photograph|poster|speech|letter|timeline)\b|\blaw you just read\b|\bDocument\s+\d+|\bDoc\s+\d+/i
const hasStim = s => {
  if (!s) return false
  if (Array.isArray(s)) return s.some(hasStim)
  if (typeof s === 'string') return s.trim().length > 40
  if (s.documents) return s.documents.some(hasStim)
  if (typeof s.content === 'string' && s.content.trim()) return true
  if (s.content && typeof s.content === 'object') return true
  if (s.table) return true
  return !!(s.image_ref && fs.existsSync(path.join(CONTENT, s.image_ref)))
}
function checkDocVisible(f, d) {
  for (const rep of d.reps || []) {
    const p = [rep.prompt, rep.question, rep.task].filter(Boolean).join(' ')
    if (DOC_RX.test(p) && !hasStim(rep.stimulus)) fail(f, `rep${rep.rep}: asks about a document it does not show — "${p.slice(0, 70)}"`)
  }
  for (const it of d.items || []) {
    const p = [it.question, it.stem, it.prompt].filter(Boolean).join(' ')
    if (DOC_RX.test(p) && !hasStim(it.stimulus)) fail(f, `item ${it.n ?? it.id}: asks about a document it does not show — "${p.slice(0, 70)}"`)
  }
  if (d.prompt && DOC_RX.test(d.prompt) && !d.source_text) fail(f, `prompt asks about a document it does not show.`)
  // enrichment try_it: the shell shows the ladder's L4 source above L5, so this is covered
  // when the ladder has a guided_write level; ENRICH_OK carries that fact in from the manifest.
  if (d.try_it?.prompt && DOC_RX.test(d.try_it.prompt) && !ENRICH_OK.has(f)) fail(f, `try_it asks about a document the page does not show.`)
  for (const t of d.tidbits || []) if (DOC_RX.test(t.text || '')) warn(f, `tidbit ${t.id} cites a document by name — check the student can see what it describes.`)
}

console.log(`CONTENT GATE — ${LIVE.size} package(s) live and gated; the rest reported as 'dark'\n`)
for (const f of fs.readdirSync(CONTENT).filter(f => f.endsWith('.json')).sort()) {
  let d
  try { d = JSON.parse(fs.readFileSync(path.join(CONTENT, f), 'utf8')) }
  catch (e) { fail(f, `not valid JSON - ${e.message}`); continue }
  if (DOCASSIST.has(f)) continue   // the DOC ASSIST block below
  checkDocVisible(f, d)
  if (LADDER_TYPE[f]) { checkLadder(f, d, LADDER_TYPE[f]); continue }
  for (const rep of d.reps || []) {
    const w = `rep${rep.rep}`
    const st = Array.isArray(rep.stimulus) ? rep.stimulus : (rep.stimulus ? [rep.stimulus] : [])
    st.forEach((doc, i) => checkDoc(f, doc, `${w}.stimulus[${i}]`))
    if (rep.type === 'regents' && !rep.exemplar) fail(f, `${w}: a regents rep with no exemplar - nothing to compare against.`)
  }
  for (const it of d.items || []) {
    const w = `item ${it.n ?? it.item_id ?? '?'}`
    checkDoc(f, it.stimulus, `${w}.stimulus`)
    if (!it.correct) fail(f, `${w}: no correct key.`)
    if (!(it.choices || []).some(c => c.key === it.correct)) fail(f, `${w}: correct '${it.correct}' matches no choice key.`)
    if (!it.reasoning) warn(f, `${w}: no reasoning - the student is told they were wrong and not why.`)
    const missing = (it.choices || []).filter(c => c.key !== it.correct && !(it.distractors || {})[c.key]).map(c => c.key)
    if (missing.length) warn(f, `${w}: no distractor note for ${missing.join(', ')} - that is quizzing, not teaching.`)
  }
}

// ── BK'S OFFICE (added 2026-09-27, Josh; Leo's order of 09-26 and BK's rulings) ──
// Checked whether or not it is published, so problems surface early. Published
// problems FAIL; unpublished ones are reported as dark.
{
  let m = {}
  try { m = JSON.parse(fs.readFileSync(path.resolve('public/arena.manifest.json'), 'utf8')) } catch {}
  const o = m.office
  if (o) {
    const tag = 'office (manifest)'
    const oFail = (live, f, msg) => { if (live) { console.error(`  FAIL  ${f}\n        ${msg}`); fails++ } else { console.warn(`  dark  ${f}\n        ${msg}`); warns++ } }
    const PH = /^PLACEHOLDER\b/
    // Ruling 5: never BK's address, never the district domain. Anywhere.
    // An email address (name@host.tld), the district domain, or a mailto link. A bare
    // social handle like "@hawk.updates" (theme 1's made-up account) is not an address.
    const ADDR = /[\w.+-]+@[\w-]+\.[\w.-]+|cppasd|\.k12\.|mailto:/i
    const walk = (v, fn, at = '') => {
      if (typeof v === 'string') return fn(v, at)
      if (Array.isArray(v)) return v.forEach((x, i) => walk(x, fn, `${at}[${i}]`))
      if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (!k.startsWith('_')) walk(x, fn, at ? `${at}.${k}` : k)
    }
    const TRAITS = ['Be Kind', 'Be Respectful', 'Be Responsible', 'Be Safe']
    const live = o.published === true
    const phO = []
    walk(o, (str, at) => {
      if (PH.test(str)) phO.push(at)
      if (ADDR.test(str)) oFail(true, tag, `${at} names an address or the district domain (ruling 5): "${str.slice(0, 60)}"`)
    })
    if (phO.length) oFail(live, tag, `${phO.length} PLACEHOLDER field(s) (${phO.join(', ')}): cannot publish until BK approves the words.`)
    if (JSON.stringify(o.frame?.traits) !== JSON.stringify(TRAITS) || o.frame?.title !== 'Be a Hawk' || o.frame?.tagline !== 'Be Hawk Proud!')
      oFail(true, tag, `frame must carry the building's exact wording: Be a Hawk · ${TRAITS.join(' · ')} · "Be Hawk Proud!"`)
    // Ruling 2026-09-27 §4: the finish screen names Mr. Kelley and the student's school account, never an address.
    if (!/Mr\. Kelley/.test(o.finish?.screen_line || '') || !/school account/.test(o.finish?.screen_line || '')) oFail(live, tag, `finish.screen_line must tell the student to send it to Mr. Kelley from their school account (ruling 09-27 §4).`)
    // Ruling §2-§3: the finish code is retired; the email carries the proof question.
    if (!(o.finish?.email_lines || []).some(l => l.includes('{proof}'))) oFail(live, tag, `finish.email_lines needs a {proof} line (ruling 09-27 §3).`)
    if (!o.background || !fs.existsSync(path.resolve('public', o.background))) oFail(live, tag, `background '${o.background}' is not in public/.`)
    // Leo's ruling 2026-09-29 12:30: the pink box carries the Hawk Pass; the finish line never
    // promises a drawing (names are never picked), and the email labels the trait lines HAWK.
    if (!o.hawk_box?.label || !o.hawk_box?.text) oFail(live, tag, `office.hawk_box needs a label and its text (ruling 09-29).`)
    if (/picked|drawing/i.test(o.finish?.screen_line || '')) oFail(true, tag, `finish.screen_line promises a drawing; the 09-29 ruling replaced that line.`)
    if (!(o.finish?.email_lines || []).includes('HAWK')) oFail(live, tag, `finish.email_lines needs the HAWK label over the trait lines (ruling 09-29).`)
    for (const t of o.themes || []) {
      const tLive = live && t.published === true
      const f = String(t.content_ref || '').replace(/^content\//, '')
      if (!/^\d{4}-\d{2}$/.test(String(t.month))) oFail(tLive, tag, `theme ${t.slug}: month must be YYYY-MM.`)
      if (!f || !fs.existsSync(path.join(CONTENT, f))) { oFail(tLive, tag, `theme ${t.slug}: content_ref '${f}' is not in public/content.`); continue }
      const d = JSON.parse(fs.readFileSync(path.join(CONTENT, f), 'utf8'))
      const phT = []
      walk(d, (str, at) => {
        if (PH.test(str)) phT.push(at)
        if (ADDR.test(str)) oFail(true, f, `${at} names an address or the district domain (ruling 5).`)
        if (/\b(\d+\s*(of|\/)\s*\d+\s*(right|correct)|score|\bpoints\b|streak|%)/i.test(str) && !/Completion[- ]points/i.test(str)) console.warn(`  warn  ${f}\n        ${at} reads like a score: "${str.slice(0, 60)}". No score in the Office.`), warns++
      })
      if (d._placeholder || phT.length) oFail(tLive, f, `theme words not approved yet: _placeholder ${d._placeholder ? 'set' : 'clear'}, ${phT.length} PLACEHOLDER string(s).`)
      for (const k of ['lesson', 'practice', 'mystery', 'bonus']) if (!d[k]) oFail(tLive, f, `missing the ${k} step.`)
      for (const [i, c] of (d.lesson?.cards || []).entries()) if (!TRAITS.includes(c.trait)) oFail(tLive, f, `lesson card ${i + 1}: trait '${c.trait}' is not one of the building's four words.`)
      for (const k of ['practice', 'mystery']) for (const it of d[k]?.items || []) {
        const w = `${k} item ${it.n ?? '?'}`
        if (!(it.choices || []).some(c => c.key === it.correct)) oFail(tLive, f, `${w}: correct key matches no choice.`)
        if ((it.hints || []).length !== 2) oFail(tLive, f, `${w}: needs two hints (CARRY-FORWARD).`)
        if (!it.reasoning) oFail(tLive, f, `${w}: needs a reason.`)
      }
      // filter_checked: true, or BK's own recorded ship-now decision ("BK ships …; checks …").
      for (const [i, n] of (d.news || []).entries()) if (n.url && !(n.filter_checked === true || (typeof n.filter_checked === 'string' && /^BK\b/.test(n.filter_checked)))) oFail(tLive, f, `news ${i + 1}: has a URL but no filter check and no BK ship-now record.`)
      // Proof questions (ruling 09-27 §2): three per theme, questions only. Answers are BK's and never ship.
      const pq = d.proof_questions || []
      if (pq.length !== 3 || !pq.every(q => typeof q === 'string' && q.trim())) oFail(tLive, f, `needs exactly three proof questions, as plain strings (ruling 09-27 §2).`)
      if (/"answers?"\s*:/i.test(JSON.stringify(d.proof_questions || null))) oFail(true, f, `proof questions must not carry answers: those are BK's only.`)
      for (const it of [...(d.practice?.items || []), ...(d.mystery?.items || [])]) for (const c of it.choices || []) if (c.key !== it.correct && !(it.distractors || {})[c.key]) console.warn(`  warn  ${f}\n        item ${it.n}: no note for wrong choice ${c.key}.`), warns++
      // The bonus by month (Leo's ruling 2026-09-28 21:59; BK 2026-09-29 11:21). A graded
      // bonus names its due date and the exact line that promises the grade, so the page
      // can drop that line the day after. A line that doesn't match would keep promising
      // a grade after the window closes, so a mismatch fails.
      if (t.bonus_due != null) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(t.bonus_due))) oFail(tLive, tag, `theme ${t.slug}: bonus_due must be YYYY-MM-DD.`)
        if (!t.bonus_due_line || !(d.bonus?.instructions || []).includes(t.bonus_due_line)) oFail(tLive, tag, `theme ${t.slug}: bonus_due_line must match one bonus instruction in ${f} exactly.`)
      } else if ((d.bonus?.instructions || []).some(s => /Completion grade/i.test(s))) oFail(tLive, tag, `theme ${t.slug}: its bonus promises a Completion grade but the manifest gives no bonus_due date.`)
      // The back link names a theme by its place in the month order (September = 1).
      if (d.back_link) {
        const n = Number(d.back_link.theme), ordered = [...(o.themes || [])].sort((a, b) => String(a.month).localeCompare(String(b.month)))
        if (!d.back_link.text || !(n >= 1 && n <= ordered.length) || ordered[n - 1]?.slug === t.slug) oFail(tLive, f, `back_link must carry text and point to an earlier theme (1–${ordered.length}), not itself.`)
      }
    }
  }
}

// ── THE THREADS MAP (added 2026-09-27, Josh; Sam's signed stops) ─────────────
// Format only, never content: every stop names a defined thread (and a defined arc),
// every link resolves, every document carries a citation, and no class dates.
{
  let m = {}
  try { m = JSON.parse(fs.readFileSync(path.resolve('public/arena.manifest.json'), 'utf8')) } catch {}
  for (const c of m.courses || []) for (const t of c.threads || []) {
    const f = String(t.content_ref || '').replace(/^content\//, '')
    const live = t.published === true
    const tf = (msg) => { if (live) { console.error(`  FAIL  ${f}\n        ${msg}`); fails++ } else { console.warn(`  dark  ${f}\n        ${msg}`); warns++ } }
    if (!f || !fs.existsSync(path.join(CONTENT, f))) { tf(`threads file '${f}' is not in public/content.`); continue }
    const d = JSON.parse(fs.readFileSync(path.join(CONTENT, f), 'utf8'))
    const threads = new Set((d.threads || []).map(x => x.id))
    const arcs = new Set((d.threads || []).flatMap(x => (x.arcs || []).map(a => a.id)))
    const ids = new Set((d.stops || []).map(x => x.id))
    for (const st of d.stops || []) {
      const ts = Array.isArray(st.thread) ? st.thread : [st.thread]
      for (const x of ts) if (!threads.has(x)) tf(`stop ${st.id}: thread '${x}' is not defined.`)
      if (st.arc && !arcs.has(st.arc)) tf(`stop ${st.id}: arc '${st.arc}' is not defined.`)
      for (const l of st.links || []) if (!ids.has(l.to)) tf(`stop ${st.id}: link to '${l.to}' goes nowhere.`)
      if (st.document && !st.document.citation) tf(`stop ${st.id}: the document has no citation.`)
      if (!['open', 'building'].includes(st.status)) tf(`stop ${st.id}: status must be open or building.`)
      if (/\b(Mon|Tue|Wed|Thu|Fri)\w*,? \d{1,2}\/\d{1,2}\b/.test(JSON.stringify([st.title, st.what_happened]))) tf(`stop ${st.id}: reads like a class date.`)
    }
  }
}

// ── DOC ASSIST (added 2026-10-01, Josh; BK's rulings 08:16, Sam's 11.2 A pack) ─────
// Format only, never content. The walk: five generic steps with tag, step and say.
// Every button word present. Casefiles carry a status; an open one carries documents.
// Every document: a number in order, title, kind, source line, casefile page, five
// steps (step 2 has no casefile question), a mode the paper uses, a BK line per step,
// and a close that sends the kid back to the casefile. Text: paragraphs and an easier
// version with its label. Picture: on disk, a usable alt, and a description.
// A licence is shown uncollapsed and must say sellable: false. Nothing reads as a
// score, nothing reads like a class date, and the pack has no typing box to offer.
{
  let m = {}
  try { m = JSON.parse(fs.readFileSync(path.resolve('public/arena.manifest.json'), 'utf8')) } catch {}
  // A document can be about numbers (a chart of percents) and a coaching line can say
  // "compare the percents". What may never appear is a kid's performance read back as a score.
  const SCORE = /\b(\d+\s*(of|\/)\s*\d+\s*(right|correct)|your score|score[ds]?\b|points?\s+(earned|scored)|streak|you got \d+)/i
  const DATE = /\b(Mon|Tue|Wed|Thu|Fri)\w*,? \d{1,2}\/\d{1,2}\b/
  const LABELS = ['walk', 'read', 'easier', 'original', 'close', 'next', 'back', 'stop']
  const MODES = new Set(['written', 'out loud', null])   // null: no mode shown (11.2 A v2, BK 10:22)
  for (const c of m.courses || []) for (const u of c.units || []) {
    const a = u.doc_assist
    if (!a) continue
    const f = String(a.content_ref || '').replace(/^content\//, '')
    const live = a.published === true && u.published === true && (c.status ?? 'open') !== 'building'
    const df = (msg) => { if (live) { console.error(`  FAIL  ${f}\n        ${msg}`); fails++ } else { console.warn(`  dark  ${f}\n        ${msg}`); warns++ } }
    if (!f || !fs.existsSync(path.join(CONTENT, f))) { df(`Doc Assist file '${f}' is not in public/content.`); continue }
    let d
    try { d = JSON.parse(fs.readFileSync(path.join(CONTENT, f), 'utf8')) } catch (e) { df(`not valid JSON - ${e.message}`); continue }
    if (d.tool !== 'Doc Assist') df(`tool must be "Doc Assist".`)
    if (!d.tile) df(`no tile line (the room card shows it).`)
    if (!d.walk_name) df(`no walk_name.`)
    const walk = d.walk || []
    if (walk.length !== 5) df(`the walk needs five steps; it has ${walk.length}.`)
    walk.forEach((w, i) => { if (!w.tag || !w.step || !w.say) df(`walk step ${i + 1}: needs tag, step and say.`) })
    for (const k of LABELS) if (!d.labels?.[k]) df(`labels.${k} is missing (a button with no word).`)
    // The step-5 card (BK 09:05, 10:26): Global's `umbrellas` (exactly six), or a course's `q4_card`.
    for (const key of ['umbrellas', 'q4_card']) {
      const u = d[key]
      if (!u) continue
      if (!d.labels?.[key] && !u.button) df(`${key}: no button word (labels.${key}).`)
      if (!u.title) df(`${key}: no title.`)
      const items = u.items || []
      if (key === 'umbrellas' ? items.length !== 6 : !items.length) df(`${key}: ${key === 'umbrellas' ? 'needs six items' : 'has no items'}; it has ${items.length}.`)
      for (const it of items) {
        if (!it.name || !it.question) df(`${key} item ${it.n ?? '?'}: needs a name and a question.`)
        if (key === 'umbrellas' && !it.issues) df(`${key} item ${it.n ?? '?'}: no issues line.`)
        for (const x of it.issue_defs || []) if (!x.name || !x.definition) df(`${key} item ${it.n ?? '?'}: an issue with no definition.`)
      }
    }
    const cfs = d.casefiles || []
    if (!cfs.length) df(`no casefiles.`)
    if (!cfs.some(x => x.status === 'open')) df(`no casefile is open.`)
    const student = [d.tile, d.walk_name, ...walk.flatMap(w => [w.tag, w.step, w.say, w.say_image]), ...Object.values(d.labels || {}),
      ...[d.umbrellas, d.q4_card].filter(Boolean).flatMap(u => [u.intro, ...(u.close || []),
        ...(u.items || []).flatMap(i => [i.name, i.question, i.issues, ...(i.issue_defs || []).map(x => x.definition)])])]
    for (const cf of cfs) {
      if (!cf.id) df(`a casefile with no id.`)
      if (!['open', 'building'].includes(cf.status)) df(`casefile ${cf.id}: status must be open or building.`)
      if (cf.status !== 'open') continue
      const docs = cf.docs || []
      if (!docs.length) df(`casefile ${cf.id} is open with no documents.`)
      docs.forEach((doc, i) => {
        const w = `casefile ${cf.id} document ${doc.n ?? '?'}`
        if (doc.n !== i + 1) df(`${w}: documents must run 1, 2, 3… in order (found ${doc.n} at position ${i + 1}).`)
        if (!doc.title) df(`${w}: no title.`)
        if (!doc.src || !/^Source:/.test(doc.src)) df(`${w}: no source line (canon §6: every document points to its record).`)
        if (!Number.isInteger(doc.page) || doc.page < 1) df(`${w}: page must be the casefile page number.`)
        if (!doc.close || !/\bpage \d+/.test(doc.close)) df(`${w}: the close must send the kid back to a casefile page.`)
        const steps = doc.steps || []
        if (steps.length !== walk.length) df(`${w}: needs one step per walk step (${walk.length}).`)
        // Two dialects (2026-10-01): US 11.2 A puts one `question` + `mode` on steps 1, 3, 4, 5.
        // Global puts a `questions` list (0–2, each { n, text, mode }) on any step but step 2.
        let asked = 0
        steps.forEach((s, j) => {
          if (!s.line) df(`${w} step ${j + 1}: no BK line.`)
          if (Array.isArray(s.questions)) {
            if (j === 1 && s.questions.length) df(`${w} step 2: Read it through carries no casefile question.`)
            if (s.questions.length > 2) df(`${w} step ${j + 1}: more than two casefile questions on one step.`)
            for (const q of s.questions) {
              asked++
              if (!q || !String(q.text || '').trim()) df(`${w} step ${j + 1}: a casefile question with no words.`)
              if (!MODES.has(q?.mode)) df(`${w} step ${j + 1}: mode must be "written", "out loud" or null.`)
              if (q && q.n != null && !Number.isInteger(q.n)) df(`${w} step ${j + 1}: a question number must be a whole number or null.`)
            }
          } else if (j === 1) { if (s.question != null || s.mode != null) df(`${w} step 2: Read it through carries no casefile question.`) }
          else {
            asked++
            if (!s.question) df(`${w} step ${j + 1}: no casefile question.`)
            if (!MODES.has(s.mode)) df(`${w} step ${j + 1}: mode must be "written", "out loud" or null.`)
          }
        })
        if (!asked) warn(f, `${w}: no casefile question on any step; check the close sends the kid to where they are.`)
        steps.forEach((s, j) => { if (s.tip && (!s.tip.title || !(s.tip.text || []).length || s.tip.text.some(t => !String(t).trim()))) df(`${w} step ${j + 1}: a tip needs a title and text.`) })
        if (doc.kind === 'text') {
          if (!(doc.text || []).length || doc.text.some(p => !String(p).trim())) df(`${w}: a text document with no text.`)
          if (!(doc.easier?.text || []).length) df(`${w}: no easier-to-read version (BK ruled one per text document).`)
          if (doc.easier && !/adapted/i.test(doc.easier.label || '')) df(`${w}: the easier version must be labeled (adapted…) (canon §6).`)
          if (!/\(adapted\)/.test(doc.src || '') && doc.easier) warn(f, `${w}: source line does not say (adapted); check it is printed word for word.`)
        } else if (doc.kind === 'image') {
          // One picture (image_file) or several (images: [{ file, label, describe, alt }]).
          const pics = Array.isArray(doc.images) && doc.images.length
            ? doc.images.map(i => ({ file: i.file, alt: i.alt || i.describe, describe: i.describe, label: i.label, many: true }))
            : [{ file: doc.image_file, alt: doc.image_alt, describe: doc.describe }]
          for (const [k, pic] of pics.entries()) {
            const pw = pics.length > 1 ? `${w} picture ${k + 1}` : w
            const img = String(pic.file || '').split('/').pop()
            if (!img || !fs.existsSync(path.join(CONTENT, img))) df(`${pw}: picture '${img}' is not in public/content.`)
            const bad = altShape(pic.alt)
            if (bad && !bad.soft) df(`${pw}: alt ${bad}.`)
            if (!pic.alt || pic.alt.length < 40) df(`${pw}: the alt must describe the picture.`)
            if (!pic.describe) df(`${pw}: a picture needs its plain description (Easier to read shows it).`)
            if (pic.many && !pic.label) df(`${pw}: with two pictures, each needs a label.`)
            student.push(pic.describe, pic.label)
          }
        } else df(`${w}: kind must be "text" or "image".`)
        // A licence is shown in full. Teach-only or NC sources must say sellable: false (CONVENTIONS §7).
        if (doc.licence) {
          if (!doc.licence.text || typeof doc.licence.sellable !== 'boolean') df(`${w}: a licence needs text and sellable true/false.`)
          else if (doc.licence.sellable && /\bNC\b|teach-only|not for sale|Regents|New Visions/i.test(doc.licence.text)) df(`${w}: a teach-only or NC source marked sellable (CONVENTIONS §7).`)
        }
        const box = b => b && typeof b === 'object' && b.title && b.text
        if (doc.before != null && !(typeof doc.before === 'string' ? doc.before.trim() : box(doc.before))) df(`${w}: 'before' must be a printed line or { title, text }.`)
        if (doc.before_we_talk != null && !box(doc.before_we_talk)) df(`${w}: before_we_talk needs a title and text.`)
        student.push(doc.title, doc.close, ...steps.flatMap(s => [s.question, s.line, ...(s.questions || []).map(q => q?.text), ...(s.tip?.text || [])]),
          ...(doc.easier?.text || []), typeof doc.before === 'string' ? doc.before : doc.before?.text, doc.before_we_talk?.text)
      })
    }
    const words = student.filter(Boolean).join(' \n ')
    const sc = words.match(SCORE)
    if (sc) df(`something reads like a score: "${sc[0]}".`)
    if (DATE.test(words)) df(`something reads like a class date.`)
  }
}

console.log(`\n${fails} fail (live) - ${warns} warn/dark`)
if (!fails) console.log('Everything a student can reach today passes.')
process.exit(fails || process.exitCode ? 1 : 0)
