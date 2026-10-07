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
const DOCCHECK = new Set()     // doc_check packs carry their own shape; the THE DOC CHECK block below checks them
const ENRICH_OK = new Set()   // enrichment files whose ladder has an L4 source the shell shows above them
try {
  const m = JSON.parse(fs.readFileSync(path.resolve('public/arena.manifest.json'), 'utf8'))
  for (const c of m.courses || []) {
    if ((c.status ?? 'open') === 'building') continue
    for (const st of c.stations || []) if (st.published && st.content_ref) LIVE.add(String(st.content_ref).replace(/^content\//, ''))
    for (const u of c.units || []) {
      if (!u.published) continue
      for (const a of u.activities || []) {
        if (a.published && a.content_ref) LIVE.add(String(a.content_ref).replace(/^content\//, ''))
        if (a.type === 'doc_check' && a.content_ref) DOCCHECK.add(String(a.content_ref).replace(/^content\//, ''))
      }
      if (u.doc_assist?.content_ref) DOCASSIST.add(String(u.doc_assist.content_ref).replace(/^content\//, ''))
      if (u.chase?.published === true && u.chase.content_ref) LIVE.add(String(u.chase.content_ref).replace(/^content\//, ''))   // a published chase blocks the build (2026-10-07)
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
  if (/^atlas-/.test(f)) continue   // the ATLAS block below
  if (/^enduring-issues-/.test(f)) continue   // the STOP MAP block below
  if (/^blueprint-/.test(f)) continue   // the WRITING LAB block below
  // A doc_check item names its stimulus by key; the DOC CHECK block below fails one that resolves to nothing.
  if (DOCCHECK.has(f)) continue
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
    // BK 2026-10-01 10:55-11:07: the email is gone. The finish card names the theme's Google
    // Classroom assignment and shows the attached doc's spaces; one of them carries the proof question.
    const cr = o.finish?.classroom
    if (!cr?.heading || !String(cr?.line || '').includes('{assignment}')) oFail(live, tag, `finish.classroom needs a heading and a line naming {assignment} (BK 10-01).`)
    if (!(cr?.spaces || []).length || !(cr.spaces || []).every(sp => sp.label && sp.fill)) oFail(live, tag, `finish.classroom.spaces: every space needs a label and a fill.`)
    if (!(cr?.spaces || []).some(sp => String(sp.fill).includes('{proof}'))) oFail(live, tag, `finish.classroom needs a {proof} space (the proof question, ruling 09-27 §3).`)
    if (!o.background || !fs.existsSync(path.resolve('public', o.background))) oFail(live, tag, `background '${o.background}' is not in public/.`)
    // Leo's ruling 2026-09-29 12:30: the pink box carries the Hawk Pass (a theme may drop it, BK 10-01 11:07).
    if ((o.themes || []).some(t => t.hawk_box !== false) && (!o.hawk_box?.label || !o.hawk_box?.text)) oFail(live, tag, `office.hawk_box needs a label and its text (ruling 09-29).`)
    // No email anywhere a student reads (BK 10-01 10:55).
    walk({ finish: o.finish, hawk: (o.themes || []).some(t => t.hawk_box !== false) ? o.hawk_box : null }, (str, at) => { if (/\bemail\b/i.test(str)) oFail(live, tag, `${at} still says email; the email is retired (BK 10-01).`) })
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
      if ((d.bonus?.instructions || []).some(x => /\bemail\b/i.test(x))) oFail(tLive, f, `the bonus still says email; the email is retired (BK 10-01).`)
      if (t.classroom_assignment != null && !String(t.classroom_assignment).trim()) oFail(tLive, f, `classroom_assignment is empty.`)
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

// ── THE STOP MAP POP-OUTS (added 2026-10-05, Josh; BK 23:39/23:42/23:47) ───────────────
// Format only, never content. Shared by the Threads block and the stop map block. An exemplar has
// exactly four parts, each words; a link's kind is change or continuity, and two stops that link
// each other agree on it; a doc_assist key resolves to a real document; an image is on disk with
// an alt; and no proof placeholder ever reaches public/. Missing exemplars or link explanations
// warn (the box falls back to the desk's reasons), so a file can ship ahead of its words.
const EX_PARTS = ['context', 'claim', 'evidence', 'explain']
function checkPopouts(d, f, course, m, fail) {
  const exBad = ex => !ex || typeof ex !== 'object' || Object.keys(ex).some(k => !EX_PARTS.includes(k))
    || EX_PARTS.some(k => typeof ex[k] !== 'string' || !ex[k].trim())
  // exemplar_by_line keys: a line id, a sub id (Will), or "<line>:<sub>" (Sam, map-stop-shape v2).
  const rows = new Set((d.lines || []).flatMap(l => [l.id, ...(l.subs || []).flatMap(x => [x.id, `${l.id}:${x.id}`])]))
  // Link kinds: the SEQ three (BK 00:04 via Sam), the 23:47 pair while files move over, and any
  // the file names in its own link_kinds.
  const KINDS = new Set(['cause_effect', 'similarity_difference', 'turning_point', 'change', 'continuity', ...Object.keys(d.link_kinds || {})])
  const ONE_WAY = new Set(['cause_effect', 'turning_point'])
  const byId = Object.fromEntries((d.stops || []).map(x => [x.id, x]))
  const daPack = unit => {
    const u = (course.units || []).find(x => String(x.number) === String(unit))
    const r = u?.doc_assist?.content_ref && String(u.doc_assist.content_ref).replace(/^content\//, '')
    try { return r ? JSON.parse(fs.readFileSync(path.join(CONTENT, r), 'utf8')) : null } catch { return null }
  }
  let noEx = 0, noKind = 0, noExplain = 0
  for (const st of d.stops || []) {
    const w = `stop ${st.id}`
    if (st.exemplar != null && exBad(st.exemplar)) fail(`${w}: an exemplar needs exactly four parts in words: ${EX_PARTS.join(', ')}.`)
    if (st.exemplar_by_line != null) {
      for (const [k, ex] of Object.entries(st.exemplar_by_line)) {
        if (!rows.has(k)) fail(`${w}: exemplar_by_line names '${k}', which is not a line, an issue, or line:sub.`)
        if (exBad(ex)) fail(`${w}: exemplar_by_line '${k}' needs exactly four parts in words: ${EX_PARTS.join(', ')}.`)
      }
    }
    if (st.status === 'open' && st.exemplar == null && st.exemplar_by_line == null) noEx++
    for (const l of st.links || []) {
      if (l.kind != null && !KINDS.has(l.kind)) fail(`${w}: link to '${l.to}' has kind '${l.kind}'; it must be one of ${[...KINDS].join(', ')}.`)
      if (l.kind == null) noKind++
      if (l.explain != null && (typeof l.explain !== 'string' || !l.explain.trim())) fail(`${w}: link to '${l.to}' has an empty explanation.`)
      if (l.explain == null) noExplain++
      const back = (byId[l.to]?.links || []).find(x => x.to === st.id)
      if (back && l.kind && back.kind && back.kind !== l.kind) fail(`${w}: calls its link to '${l.to}' ${l.kind}; '${l.to}' calls it ${back.kind}.`)
      else if (back && ONE_WAY.has(l.kind) && back.kind === l.kind) fail(`${w}: ${l.kind} runs one way, but '${l.to}' names it back to this stop too.`)
    }
    if (st.doc_assist != null) {
      const mm = String(st.doc_assist).match(/^(\d+\.\d+)\/([A-Z])\/(\d+[a-z]?)$/)
      if (!mm) fail(`${w}: doc_assist '${st.doc_assist}' must read unit/casefile/number, like 11.1/A/2.`)
      else {
        const pk = daPack(mm[1])
        const cf = pk && (pk.casefiles || []).find(c => String(c.id).toUpperCase() === mm[2])
        const doc = cf && (cf.docs || []).find(x => String(x.n).toLowerCase() === mm[3].toLowerCase())
        if (!doc) fail(`${w}: doc_assist '${st.doc_assist}' is not a document in ${mm[1]}'s Doc Assist.`)
      }
    }
    if (st.image != null) {
      const im = String(st.image).split('/').pop()
      if (!fs.existsSync(path.join(CONTENT, im))) fail(`${w}: image '${im}' is not in public/content.`)
      if (!st.image_alt) fail(`${w}: an image needs image_alt.`)
    }
  }
  if (/\[PLACEHOLDER/i.test(JSON.stringify(d))) fail('a proof placeholder is in a live file. Placeholders never leave proof/.')
  if (noEx) { console.warn(`  note  ${f}\n        ${noEx} open stop(s) without an exemplar yet (the box shows the desk's reasons until it lands).`); warns++ }
  if (noKind || noExplain) { console.warn(`  note  ${f}\n        ${noKind} link(s) without a kind, ${noExplain} without an explanation (the bridge shows the short why until they land).`); warns++ }
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
    // map-stop-shape v1 (10/5): lines with subs, on_lines per stop. Same checks as the stop map.
    if (d.lines) {
      const L = new Map(d.lines.map(l => [l.id, new Set((l.subs || []).map(x => x.id))]))
      const ids2 = new Set((d.stops || []).map(x => x.id))
      for (const st of d.stops || []) {
        const w = `stop ${st.id}`
        if (!['open', 'building'].includes(st.status)) tf(`${w}: status must be open or building.`)
        if (!(st.on_lines || []).length) tf(`${w}: on no line.`)
        for (const e of st.on_lines || []) {
          if (!L.has(e.line)) tf(`${w}: line '${e.line}' is not defined.`)
          else if (e.sub && !L.get(e.line).has(e.sub)) tf(`${w}: sub '${e.sub}' is not under '${e.line}'.`)
          if (!e.reason || !e.question) tf(`${w}: a line entry needs a reason and a question.`)
        }
        for (const l of st.links || []) if (!ids2.has(l.to)) tf(`${w}: link to '${l.to}' goes nowhere.`)
        for (const doc of [st.document, ...(st.also_read || [])]) if (doc && !doc.citation) tf(`${w}: a document has no citation.`)
        if (st.atlas != null && !/^[A-Za-z0-9._-]+$/.test(st.atlas)) tf(`${w}: atlas id is not a map id.`)
        if (/\b(Mon|Tue|Wed|Thu|Fri)\w*,? \d{1,2}\/\d{1,2}\b/.test(JSON.stringify([st.title, st.what_happened]))) tf(`${w}: reads like a class date.`)
      }
      checkPopouts(d, f, c, m, tf)
      continue
    }
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
    // The French step-5 card: every issue the English card defines has a French definition.
    if (d.fr?.umbrellas && d.umbrellas) {
      const fu = d.fr.umbrellas
      if ((fu.items || []).length !== (d.umbrellas.items || []).length) df(`fr.umbrellas: needs the same ${(d.umbrellas.items || []).length} items as the English card.`)
      for (const it of d.umbrellas.items || []) for (const x of it.issue_defs || []) if (!fu.issue_defs?.[x.name]) df(`fr.umbrellas: no French definition for '${x.name}'.`)
    }
    const cfs = d.casefiles || []
    if (!cfs.length) df(`no casefiles.`)
    if (!cfs.some(x => x.status === 'open')) df(`no casefile is open.`)
    const student = [d.tile, d.walk_name, ...walk.flatMap(w => [w.tag, w.step, w.say, w.say_image]), ...Object.values(d.labels || {}),
      ...[d.umbrellas, d.q4_card].filter(Boolean).flatMap(u => [u.intro, ...(u.close || []),
        ...(u.items || []).flatMap(i => [i.name, i.question, i.issues, ...(i.issue_defs || []).map(x => x.definition)])])]
    if (d.fr) student.push(d.fr.note, d.fr.annotate_note, ...Object.values(d.fr.labels || {}), ...(d.fr.walk || []).flatMap(x => [x.tag, x.step, x.say, x.say_image]))
    for (const cf of cfs) {
      if (!cf.id) df(`a casefile with no id.`)
      if (!['open', 'building'].includes(cf.status)) df(`casefile ${cf.id}: status must be open or building.`)
      if (cf.status !== 'open') continue
      const docs = cf.docs || []
      if (!docs.length) df(`casefile ${cf.id} is open with no documents.`)
      docs.forEach((doc, i) => {
        const w = `casefile ${cf.id} document ${doc.n ?? '?'}`
        // Numbers are what the page prints: they may continue across casefiles (11.1 B starts at 8)
        // and carry a letter ("16b"). They must be unique and never run backward.
        const num = parseInt(String(doc.n), 10)
        if (!(Number.isInteger(doc.n) || /^\d+[a-z]?$/.test(String(doc.n)))) df(`${w}: a document number must be a number, or a number and a letter ("16b").`)
        if (docs.findIndex(o => String(o.n) === String(doc.n)) !== i) df(`${w}: two documents share a number.`)
        if (i > 0 && num < parseInt(String(docs[i - 1].n), 10)) df(`${w}: document numbers run backward (after ${docs[i - 1].n}).`)
        if (!doc.title) df(`${w}: no title.`)
        if (!doc.src || String(doc.src).trim().length < 15) df(`${w}: no source line (canon §6: every document points to its record).`)   // as printed: "Source: …", "LEFT — Source: …", or a compiled-by line (11.1 B Doc 13)
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
        if (doc.note != null && !(doc.note && doc.note.text)) df(`${w}: a note needs text.`)
        // ── Doc Assist v4 (2026-10-02, Will's 10.2 B and C; BK signed 11:32, 13:22) ──
        if (doc.word_watch != null && !box(doc.word_watch)) df(`${w}: word_watch needs a title and text.`)
        if (doc.word_watch) student.push(doc.word_watch.text)
        if (doc.annotate) {
          const A = d.annotate, a = doc.annotate
          if (!A) df(`${w}: annotate notes with no pack.annotate (no method, no labels).`)
          else {
            const meth = A.methods?.[a.kind]
            if (!Array.isArray(meth) || !meth.length || meth.some(m => !Array.isArray(m) || !m[0] || !m[1])) df(`${w}: annotate kind '${a.kind}' has no method (pack.annotate.methods.${a.kind}: [tag, step] pairs).`)
            if (!A.model_label || !A.model_note) df(`${w}: pack.annotate needs model_label and model_note.`)
            if (!d.labels?.annotate && !A.button) df(`${w}: How to annotate has no button word.`)
          }
          const notes = a.notes || []
          if (!notes.length) df(`${w}: annotate has no model notes.`)
          for (const [k, n] of notes.entries()) {
            if (!n.where || !n.note) df(`${w} note ${k + 1}: needs where and note.`)
            if (!['box', 'circle', 'margin', 'underline'].includes(n.mark)) df(`${w} note ${k + 1}: mark must be box, circle, underline or margin.`)
            // On a text document the note is drawn on the words, so the words must be there.
            // "Lately, in the source line" (Sam, 10-02) points into the source line only.
            const ptr = String(n.where || '').match(/^(.*), in the source line$/)
            if (doc.kind === 'text' && n.where && !(ptr ? String(doc.src).includes(ptr[1]) : [doc.src, ...(doc.text || [])].some(t => String(t).includes(n.where)))) df(`${w} note ${k + 1}: '${n.where}' is not in the document or its source line.`)
          }
          if (a.oe) {
            if (!['example', 'where'].includes(a.oe.kind) || !a.oe.text) df(`${w}: outside evidence needs kind example|where and text.`)
            else if (!(a.oe.kind === 'where' ? A?.oe_where_label : A?.oe_example_label)) df(`${w}: no label for outside evidence kind '${a.oe.kind}'.`)
          }
          student.push(...notes.map(n => n.note), a.oe?.text)
        }
        if (doc.fr) {
          const P = d.fr, F = doc.fr, fw = `${w} (français)`
          if (!P) df(`${fw}: a French document with no pack.fr (no button, no labels).`)
          else {
            for (const k of LABELS) if (!P.labels?.[k]) df(`${fw}: fr.labels.${k} is missing.`)
            if ((P.walk || []).length !== walk.length || (P.walk || []).some(x => !x.tag || !x.step || !x.say)) df(`${fw}: fr.walk needs ${walk.length} steps with tag, step and say.`)
            if (!(F.label || P.label)) df(`${fw}: no « (traduit en français) » label.`)
          }
          if (!F.title) df(`${fw}: no title.`)
          if (doc.kind === 'text' && (!(F.text || []).length || F.text.some(p => !String(p).trim()))) df(`${fw}: a text document with no French text.`)
          if (doc.kind === 'image' && !F.describe) df(`${fw}: a picture with no French description.`)
          if (!F.close || !/\bpage \d+/.test(F.close)) df(`${fw}: the close must send the kid back to a casefile page.`)
          const fs_ = F.steps || []
          if (fs_.length !== steps.length) df(`${fw}: needs one step per walk step (${steps.length}).`)
          fs_.forEach((s, j) => {
            if (!s?.line) df(`${fw} step ${j + 1}: no line.`)
            const enAsks = j !== 1 && (steps[j]?.question || (steps[j]?.questions || []).length)
            if (enAsks && !s?.question) df(`${fw} step ${j + 1}: the English asks a question; the French doesn't.`)
            if (j === 1 && s?.question) df(`${fw} step 2: Read it through carries no question.`)
          })
          // Everything the English page shows, the French page shows.
          if (doc.before_we_talk && !F.before_we_talk) df(`${fw}: no French before_we_talk.`)
          if (typeof doc.before === 'string' && !F.before) df(`${fw}: no French 'before' line.`)
          if (steps.some(s => s.tip) && !(F.tip?.title && (F.tip.text || []).length)) df(`${fw}: the English has a tip; the French has none.`)
          if (doc.word_watch && !box(F.word_watch)) df(`${fw}: the English has a WORD WATCH; the French has none.`)
          student.push(F.title, F.close, F.describe, ...(F.text || []), ...fs_.flatMap(s => [s?.question, s?.line]), ...(F.tip?.text || []), F.word_watch?.text)
        }
        student.push(doc.title, doc.close, ...steps.flatMap(s => [s.question, s.line, ...(s.questions || []).map(q => q?.text), ...(s.tip?.text || [])]),
          ...(doc.easier?.text || []), typeof doc.before === 'string' ? doc.before : doc.before?.text, doc.before_we_talk?.text, doc.note?.text)
      })
    }
    const words = student.filter(Boolean).join(' \n ')
    const sc = words.match(SCORE)
    if (sc) df(`something reads like a score: "${sc[0]}".`)
    if (DATE.test(words)) df(`something reads like a class date.`)
  }
}

// ── THE DOC CHECK (added 2026-09-30, Josh; Sam's 11.1 Test Practice v2) ──────
// Format only, never content. Every item: four choices, a key, two hints (CARRY-FORWARD),
// a proof and three decoys that are EXACT spans of the document or its source line, a
// feedback line, a known support level, and walk lines for every checklist step when it
// walks. Picture items: boxes inside the picture, the picture on disk, a usable alt.
{
  let m = {}
  try { m = JSON.parse(fs.readFileSync(path.resolve('public/arena.manifest.json'), 'utf8')) } catch {}
  const SUPPORT = new Set(['walk', 'show', 'tuck', 'none'])
  const SCORE = /\b(\d+\s*(of|\/)\s*\d+\s*(right|correct)|score|\bpoints\b|streak|\bpercent\b|%)/i
  for (const c of m.courses || []) for (const u of c.units || []) for (const a of u.activities || []) {
    if (a.type !== 'doc_check') continue
    const f = String(a.content_ref || '').replace(/^content\//, '')
    const live = a.published === true && u.published === true && (c.status ?? 'open') !== 'building'
    const df = (msg) => { if (live) { console.error(`  FAIL  ${f}\n        ${msg}`); fails++ } else { console.warn(`  dark  ${f}\n        ${msg}`); warns++ } }
    if (a.opens_on != null && !/^\d{4}-\d{2}-\d{2}$/.test(String(a.opens_on))) df(`opens_on must be YYYY-MM-DD.`)
    if (!f || !fs.existsSync(path.join(CONTENT, f))) { df(`doc_check file '${f}' is not in public/content.`); continue }
    const d = JSON.parse(fs.readFileSync(path.join(CONTENT, f), 'utf8'))
    const steps = d.checklist || []
    if (!d.credit) df(`no credit line.`)
    if (d.licence?.sellable !== false || !d.licence?.attribution) df(`a teach-only pack needs licence { sellable: false, attribution } (CONVENTIONS §7).`)
    if (!(d.items || []).length) df(`no items.`)
    for (const it of d.items || []) {
      const w = `item ${it.n ?? '?'}`
      const s = d.stimuli?.[it.stimulus]
      if (!s) { df(`${w}: stimulus '${it.stimulus}' is not defined (no task without its document).`); continue }
      if ((it.choices || []).length !== 4) df(`${w}: needs four choices.`)
      if (!(Number.isInteger(it.key) && it.key >= 1 && it.key <= (it.choices || []).length)) df(`${w}: key must point at a choice.`)
      if ((it.hints || []).length !== 2) df(`${w}: needs two hints (CARRY-FORWARD).`)
      if (!it.feedback) df(`${w}: needs a feedback line.`)
      if ((it.decoys || []).length !== 3) df(`${w}: needs three decoys.`)
      if (!SUPPORT.has(it.support || 'none')) df(`${w}: support '${it.support}' is not walk, show, tuck or none.`)
      if ((it.support || 'none') !== 'none' && !steps.length) df(`${w}: support '${it.support}' but the pack has no checklist.`)
      if (it.support === 'walk' && (it.walk_lines || []).length !== steps.length) df(`${w}: a walked item needs one walk line per checklist step (${steps.length}).`)
      const hay = `${s.text || ''} ${s.src || ''}`
      for (const sp of [it.proof, ...(it.decoys || [])]) {
        if (typeof sp !== 'string' || !sp) { df(`${w}: an empty proof or decoy.`); continue }
        if (sp.startsWith('IMAGE · ')) continue
        if (!hay.includes(sp)) df(`${w}: "${sp.slice(0, 50)}" is not an exact span of its document or source line.`)
      }
      if (String(it.proof || '').startsWith('IMAGE · ')) {
        if (!s.image_ref || !fs.existsSync(path.join(CONTENT, s.image_ref))) df(`${w}: picture '${s.image_ref}' is not in public/content.`)
        const bad = altShape(s.image_alt)
        if (bad && !bad.soft) df(`${w}: the picture's alt ${bad}.`)
        const bx = it.proof_boxes || []
        if (!bx.length || !bx.every(b => [b.x, b.y, b.w, b.h].every(v => typeof v === 'number' && v >= 0 && v <= 100) && b.x + b.w <= 100 && b.y + b.h <= 100 && b.label))
          df(`${w}: a picture proof needs proof_boxes inside the picture, each with a label.`)
      }
      if (s.image_ref && (!s.image_alt || s.image_alt.length < 40)) df(`${w}: picture '${s.image_ref}' needs a describing alt.`)
      const student = [it.stem, ...(it.choices || []), ...(it.hints || []), it.feedback, ...(it.walk_lines || [])].join(' ')
      if (SCORE.test(student)) df(`${w}: something reads like a score.`)
      if (/\b(Mon|Tue|Wed|Thu|Fri)\w*,? \d{1,2}\/\d{1,2}\b/.test(student)) df(`${w}: reads like a class date.`)
    }
  }
}

// ── THE STOP MAP, shared shape v1 (added 2026-10-05, Josh; confirmed 21:29) ─────────
// Format only, never content. Global's Enduring Issues map now; Sam's Threads map when it moves.
// Every on_lines entry names a defined line, its sub sits under that line, and it carries a
// reason and a question. Every link resolves, every document and also_read entry is cited,
// status is open or building, an `atlas` id is well formed, no class dates, and no "thread"
// on a Global screen.
{
  let m = {}
  try { m = JSON.parse(fs.readFileSync(path.resolve('public/arena.manifest.json'), 'utf8')) } catch {}
  for (const c of m.courses || []) for (const t of c.issues || []) {
    const f = String(t.content_ref || '').replace(/^content\//, '')
    const live = t.published === true
    const sf = (msg) => { if (live) { console.error(`  FAIL  ${f}\n        ${msg}`); fails++ } else { console.warn(`  dark  ${f}\n        ${msg}`); warns++ } }
    if (!f || !fs.existsSync(path.join(CONTENT, f))) { sf(`stop map file '${f}' is not in public/content.`); continue }
    let d
    try { d = JSON.parse(fs.readFileSync(path.join(CONTENT, f), 'utf8')) } catch (e) { sf(`not valid JSON - ${e.message}`); continue }
    const lines = new Map((d.lines || []).map(l => [l.id, new Set((l.subs || []).map(x => x.id))]))
    const ids = new Set((d.stops || []).map(x => x.id))
    if (!lines.size) sf('no lines.')
    for (const l of d.lines || []) if (!l.name) sf(`line ${l.id}: no name.`)
    for (const st of d.stops || []) {
      const w = `stop ${st.id}`
      if (!['open', 'building'].includes(st.status)) sf(`${w}: status must be open or building.`)
      if (!(st.on_lines || []).length) sf(`${w}: on no line.`)
      for (const e of st.on_lines || []) {
        if (!lines.has(e.line)) sf(`${w}: line '${e.line}' is not defined.`)
        else if (e.sub && !lines.get(e.line).has(e.sub)) sf(`${w}: issue '${e.sub}' is not under line '${e.line}'.`)
        if (!e.reason || !e.question) sf(`${w}: a line entry needs a reason and a question.`)
      }
      for (const l of st.links || []) if (!ids.has(l.to)) sf(`${w}: link to '${l.to}' goes nowhere.`)
      for (const doc of [st.document, ...(st.also_read || [])]) if (doc && !doc.citation) sf(`${w}: a document has no citation.`)
      if (st.atlas != null && !/^[A-Za-z0-9._-]+$/.test(st.atlas)) sf(`${w}: atlas id is not a map id.`)
      if (/\b(Mon|Tue|Wed|Thu|Fri)\w*,? \d{1,2}\/\d{1,2}\b/.test(JSON.stringify([st.title, st.what_happened]))) sf(`${w}: reads like a class date.`)
    }
    if (c.id === 'global10r') {
      const shown = JSON.stringify({ lines: (d.lines || []).map(l => [l.name, l.question, (l.subs || []).map(x => [x.name, x.definition])]),
        stops: (d.stops || []).map(x => [x.title, x.what_happened, x.when, (x.on_lines || []).map(e => [e.reason, e.question]), x.links, x.exemplar, x.exemplar_by_line]) })
      if (/\bthreads?\b/i.test(shown)) sf('the word "thread" appears on a Global screen (BK 9/26).')
    }
    checkPopouts(d, f, c, m, sf)
  }
}

// ── THE WRITING LAB · Blueprint (added 2026-10-05, Josh; Sam's and Will's Set 1) ─────
// Format only, never content. Every document shows its source line and its picture is on disk
// with an alt. US: every card's job is a defined bin, its clue is in its question, also_fits names
// bins. Global: every must-find and also-fair issue is under an umbrella, and each must-find has a
// reason. Levels name what opens them. No score words anywhere a kid reads.
{
  let m = {}
  try { m = JSON.parse(fs.readFileSync(path.resolve('public/arena.manifest.json'), 'utf8')) } catch {}
  const WL_SCORE = /\b\d+\s*(of|out of|\/)\s*\d+\b|\b\d+\s*%|\b\d+\s*points?\b|\bscore\b|\bstreak\b/i
  for (const c of m.courses || []) for (const e of c.writing_lab || []) {
    const f = String(e.content_ref || '').replace(/^content\//, '')
    const live = e.published === true
    const wf = (msg) => { if (live) { console.error(`  FAIL  ${f}\n        ${msg}`); fails++ } else { console.warn(`  dark  ${f}\n        ${msg}`); warns++ } }
    if (!f || !fs.existsSync(path.join(CONTENT, f))) { wf(`writing lab file '${f}' is not in public/content.`); continue }
    let d
    try { d = JSON.parse(fs.readFileSync(path.join(CONTENT, f), 'utf8')) } catch (er) { wf(`not valid JSON - ${er.message}`); continue }
    const img = file => { const g = (e.image_map && e.image_map[file]) || file; return fs.existsSync(path.join(CONTENT, g)) }
    if (!(d.docs || []).length) wf('no documents.')
    for (const l of d.levels || []) if (l.opens_after != null && !(d.levels || []).some(x => x.n === l.opens_after)) wf(`level ${l.n} opens after a level that doesn't exist.`)
    if (d.multi_tag) {
      const issues = new Set((d.bins || []).flatMap(b => (b.issues || []).map(i => i.name)))
      for (const doc of d.docs || []) {
        const w = `document ${doc.n}`
        if (!doc.source) wf(`${w}: no source line.`)
        if (doc.image && !img(doc.image)) wf(`${w}: picture '${doc.image}' is not in public/content.`)
        if (doc.image && !doc.image_alt) wf(`${w}: picture with no alt.`)
        if (!(doc.must_find || []).length) wf(`${w}: nothing to find.`)
        for (const mf of doc.must_find || []) { if (!issues.has(mf.issue)) wf(`${w}: '${mf.issue}' is not an issue on the card.`); if (!mf.reason) wf(`${w}: '${mf.issue}' has no reason.`) }
        for (const af of doc.also_fair || []) if (!issues.has(af)) wf(`${w}: also-fair '${af}' is not an issue on the card.`)
      }
    } else {
      const jobs = new Set((d.jobs || []).map(j => j.id))
      for (const doc of d.docs || []) {
        const w = `document ${doc.n}`
        if (!doc.source) wf(`${w}: no source line.`)
        if (!jobs.has(doc.job)) wf(`${w}: job '${doc.job}' is not a bin.`)
        if (!doc.clue || !String(doc.question || '').toLowerCase().includes(String(doc.clue).toLowerCase())) wf(`${w}: the clue isn't in the question.`)
        for (const a of doc.also_fits || []) if (!jobs.has(a)) wf(`${w}: also_fits '${a}' is not a bin.`)
        if (doc.image && !img(doc.image.file)) wf(`${w}: picture '${doc.image.file}' is not in public/content.`)
        if (doc.image && (!doc.image.image_alt || !doc.image.source)) wf(`${w}: picture needs an alt and a source line.`)
      }
    }
    if (WL_SCORE.test(JSON.stringify(d.screens || {}))) wf('a screen line reads like a score.')
  }
}

// ── THE ATLAS (added 2026-10-05, Josh; Leo's order 21:07, BK 21:11 and 21:14) ──────────
// Format only, never content. Every map: a stable id, a unit this course has, a casefile
// letter or none, a title, a one-line caption, a picture on disk with a describing alt,
// a source line and where the picture came from (public domain or drawn new). Every layer,
// Then → Now step and route carries its own source line, because it is a picture of
// geography too. A route is path data only, never markup. A walk step has a tag and what to
// look for; a step that points at the map carries [x, y, w, h] in map pixels. Placeholder
// maps never reach public/content. Nothing reads as a score or a class date.
{
  let m = {}
  try { m = JSON.parse(fs.readFileSync(path.resolve('public/arena.manifest.json'), 'utf8')) } catch {}
  const PUB = path.resolve('public')
  const onDisk = p => p && fs.existsSync(path.join(PUB, String(p).replace(/^\//, '')))
  const ATLAS_SCORE = /\b\d+\s*(of|out of|\/)\s*\d+\b|\b\d+\s*%|\b\d+\s*points?\b|\bscore\b|\bstreak\b/i
  const DATE = /\b(Mon|Tue|Wed|Thu|Fri)\w*,? \d{1,2}\/\d{1,2}\b/
  const PATH_D = /^[MmLlHhVvCcSsQqTtAaZz0-9.,\s+-]+$/
  const seen = new Set()
  for (const c of m.courses || []) for (const a of c.atlas || []) {
    const f = String(a.content_ref || '').replace(/^content\//, '')
    const live = a.published === true
    const af = (msg) => { if (live) { console.error(`  FAIL  ${f}\n        ${msg}`); fails++ } else { console.warn(`  dark  ${f}\n        ${msg}`); warns++ } }
    if (!f || !fs.existsSync(path.join(CONTENT, f))) { af(`atlas file '${f}' is not in public/content.`); continue }
    let d
    try { d = JSON.parse(fs.readFileSync(path.join(CONTENT, f), 'utf8')) } catch (e) { af(`not valid JSON - ${e.message}`); continue }
    const units = new Set((c.units || []).map(u => String(u.number)))
    const checkWalk = (walk, where, mapSize) => {
      for (const [i, st] of (walk || []).entries()) {
        const w = `${where} walk step ${i + 1}`
        if (!st.tag || !String(st.tag).trim()) af(`${w}: no tag.`)
        if (!st.say || !String(st.say).trim()) af(`${w}: no 'say' (what to look for).`)
        if (st.focus != null) {
          if (!mapSize) af(`${w}: a course-wide step can't point at a spot; only a map's own walk can.`)
          else if (!Array.isArray(st.focus) || st.focus.length !== 4 || st.focus.some(n => typeof n !== 'number' || n < 0)) af(`${w}: focus must be [x, y, w, h] in map pixels.`)
        }
        if (ATLAS_SCORE.test(`${st.tag} ${st.say} ${st.ask || ''} ${st.answer || ''}`)) af(`${w}: something reads like a score.`)
        if (st.answer_focus != null && (!mapSize || !Array.isArray(st.answer_focus) || st.answer_focus.length !== 4)) af(`${w}: answer_focus must be [x, y, w, h] on a map's own walk.`)
        if (mapSize && st.ask && !st.answer) warn(f, `${w}: asks a question with no answer (BK 23:38: the Atlas answers its questions).`)
      }
    }
    checkWalk(d.walk, 'course', false)
    for (const mp of d.maps || []) {
      const w = `map ${mp.id || '(no id)'}`
      if (!mp.id || !/^[A-Za-z0-9._-]+$/.test(mp.id)) af(`${w}: id must be letters, numbers, dots, dashes (it lives in links).`)
      if (seen.has(mp.id)) af(`${w}: id used twice.`); seen.add(mp.id)
      if (mp.placeholder) af(`${w}: a placeholder map is in public/content. Placeholders live in proof/ only.`)
      if (!['open', 'building'].includes(mp.status)) af(`${w}: status must be open or building.`)
      if (!units.has(String(mp.unit))) af(`${w}: unit '${mp.unit}' is not a unit in this course, so no room would show it.`)
      if (mp.casefile != null && !/^[A-Z]$/.test(String(mp.casefile))) af(`${w}: casefile must be a letter or null.`)
      for (const k of ['title', 'caption', 'source']) if (!mp[k] || !String(mp[k]).trim()) af(`${w}: no ${k}.`)
      if (!['public-domain', 'drawn-new'].includes(mp.origin)) af(`${w}: origin must be public-domain or drawn-new (canon 1 and 6).`)
      if (!onDisk(mp.image)) af(`${w}: image '${mp.image}' is not in public/.`)
      if (mp.thumb && !onDisk(mp.thumb)) af(`${w}: thumb '${mp.thumb}' is not in public/.`)
      const alt = altShape(mp.image_alt)
      if (alt && typeof alt === 'string') af(`${w}: image_alt ${alt}.`)
      else if (alt?.soft) warn(f, `${w}: image_alt ${alt.soft}.`)
      if (onDisk(mp.image) && fs.statSync(path.join(PUB, String(mp.image).replace(/^\//, ''))).size > 900_000) warn(f, `${w}: the image is over 900 KB; school wifi.`)
      for (const l of mp.layers || []) {
        if (!l.id || !l.label || !l.source) af(`${w} layer ${l.id || '?'}: needs id, label and source.`)
        if (!onDisk(l.image)) af(`${w} layer ${l.id || '?'}: image '${l.image}' is not in public/.`)
      }
      if (mp.then_now && mp.then_now.length < 2) af(`${w}: Then → Now needs at least two steps.`)
      for (const [i, s2] of (mp.then_now || []).entries()) {
        if (!s2.label || !s2.source) af(`${w} step ${i + 1}: needs a label and a source.`)
        if (!onDisk(s2.image)) af(`${w} step ${i + 1}: image '${s2.image}' is not in public/.`)
      }
      for (const r of mp.routes || []) {
        if (!r.id || !r.label || !r.source) af(`${w} route ${r.id || '?'}: needs id, label and source.`)
        if (!r.path || !PATH_D.test(r.path)) af(`${w} route ${r.id || '?'}: path must be SVG path data only (M, L, C … and numbers).`)
      }
      checkWalk(mp.walk, w, true)
      const student = [mp.title, mp.caption, ...(mp.layers || []).map(l => l.label), ...(mp.then_now || []).map(s2 => s2.label), ...(mp.routes || []).map(r => r.label)].join(' ')
      if (ATLAS_SCORE.test(student)) af(`${w}: something reads like a score.`)
      if (DATE.test(student)) af(`${w}: reads like a class date.`)
    }
  }
}

// ── THE ARENA CHASE (added 2026-10-06, Josh; BK 22:15 "yes." to Sam's concept) ──────────
// Format only, never content. A chase pack hangs off a unit (manifest unit.chase). Every stop:
// a place and a year; a clue with text, a tool the Arena has and a link that resolves (an Atlas
// map id this course has, a Threads stop id, or a Doc Assist casefile/number); a clue question
// with an answer; a Regents-style question on a document that exists in the unit's Doc Assist,
// with two hints and a Why; one evidence line. The trail's words, the warrant lines and a key.
// No clock, nothing that reads as a score. A key must be in the pack (the build seals it).
{
  let m = {}
  try { m = JSON.parse(fs.readFileSync(path.resolve('public/arena.manifest.json'), 'utf8')) } catch {}
  const C_SCORE = /\b\d+\s*(of|out of|\/)\s*\d+\b|\b\d+\s*%|\b\d+\s*points?\b|\bscore\b|\bstreak\b|\bseconds?\b|\btimer\b/i
  const read = f => { try { return JSON.parse(fs.readFileSync(path.join(CONTENT, String(f).replace(/^content\//, '')), 'utf8')) } catch { return null } }
  for (const c of m.courses || []) for (const u of c.units || []) {
    if (!u.chase) continue
    const f = String(u.chase.content_ref || '').replace(/^content\//, '')
    const cf = (msg) => (u.chase.published === true ? fail : warn)(f || `${u.slug} chase`, msg)
    const pk = read(f)
    if (!pk) { cf(`${u.slug}: chase content_ref '${f}' is not in public/content.`); continue }
    const da = u.doc_assist ? read(u.doc_assist.content_ref) : null
    const docs = new Set((da?.casefiles || []).flatMap(x => (x.docs || []).map(d => `${x.id}/${d.n}`)))
    const atlas = read(`atlas-${c.id}.json`), maps = new Set((atlas?.maps || []).map(x => x.id))
    const threads = read((c.threads || [])[0]?.content_ref || ''), tstops = new Set((threads?.stops || []).map(x => x.id))
    const issues = read((c.issues || [])[0]?.content_ref || ''), istops = new Set((issues?.stops || []).map(x => x.id))
    // One act ({ stops, door? }) or several ({ acts: [{ title, intro, stops, door? }] }), 2026-10-07.
    const acts = Array.isArray(pk.acts) && pk.acts.length ? pk.acts : [{ stops: pk.stops, door: pk.door }]
    const allStops = acts.flatMap(a => a.stops || [])
    if (!pk.id || !allStops.length) cf('needs an id and at least one stop.')
    if (Array.isArray(pk.acts) && Array.isArray(pk.stops)) cf('use acts or stops, not both.')
    for (const [ai, a] of acts.entries()) if (ai > 0 && !(a.title || (a.intro || []).length)) cf(`act ${ai + 1}: needs a title or intro lines (its opening screen).`)
    if (!Array.isArray(pk.cold) || pk.cold.length < 2) cf('the trail needs at least two states in words (cold), warmest first.')
    if (!Array.isArray(pk.warrant) || !pk.warrant.length) cf('needs warrant lines.')
    if (!pk.final || !(pk.final.key_words || []).length) cf('needs the teacher key (final.key_words); the build seals it.')
    const pub = p => fs.existsSync(path.resolve('public', String(p || '').replace(/^\/+/, '')))
    if (pk.meter) {
      const mt = pk.meter
      if (!mt.label || !(Number.isInteger(mt.goal) && mt.goal > 0) || !Number.isInteger(mt.first_try) || !Number.isInteger(mt.after_hint)) cf('meter needs a label, a goal and whole numbers for first_try and after_hint.')
      if (!acts.some(a => a.door)) cf('a meter needs a door to end at.')
    }
    if (pk.suspect?.portrait && (!pub(pk.suspect.portrait) || !pk.suspect.portrait_alt || !pk.suspect.portrait_src)) cf('the suspect portrait needs its file in public/, portrait_alt and portrait_src (where it came from).')
    if (pk.end && (pk.end.photo && (!pub(pk.end.photo) || !pk.end.alt || !pk.end.credit))) cf('the end photo needs its file in public/, alt and credit.')
    const qOk = (q, w) => {
      if (!q.stem || !Array.isArray(q.options) || q.options.length < 2 || !Number.isInteger(q.answer)) cf(`${w}: the question needs a stem, choices and an answer.`)
      if ((q.hints || []).length !== 2 || !q.why) cf(`${w}: two hints and a Why on the question.`)
    }
    if (!allStops.some(st => st.question) && !acts.some(a => a.door)) cf('at least one stop needs a question.')
    for (const [i, st] of allStops.entries()) {
      const w = `stop ${i + 1}`
      if (!st.place || !st.year) cf(`${w}: a place and a year.`)
      if (st.trail != null && !(pk.cold || []).includes(st.trail)) cf(`${w}: trail '${st.trail}' isn't one of the pack's cold words.`)
      const cl = st.clue || {}
      if (!cl.text || !['atlas', 'threads', 'doc-assist', 'issues'].includes(cl.tool)) cf(`${w}: a clue with text and a tool (atlas, threads, issues, doc-assist).`)
      if (cl.tool === 'atlas' && !maps.has(cl.link)) cf(`${w}: Atlas map '${cl.link}' isn't in this course's Atlas.`)
      if (cl.tool === 'threads' && cl.link && !tstops.has(cl.link)) cf(`${w}: Threads stop '${cl.link}' isn't on the map.`)
      if (cl.tool === 'issues' && cl.link && !istops.has(cl.link)) cf(`${w}: Enduring Issues stop '${cl.link}' isn't on the map.`)
      if (cl.tool === 'doc-assist' && cl.link && !docs.has(String(cl.link).toUpperCase().replace(/^([A-Z])\//, '$1/'))) cf(`${w}: Doc Assist '${cl.link}' isn't in this unit's casefiles.`)
      const ask = cl.ask || {}
      if (!ask.prompt || (ask.type === 'type' ? !(ask.accept || []).length : !(Array.isArray(ask.options) && ask.options.length >= 2 && Number.isInteger(ask.answer)))) cf(`${w}: the clue's question needs a prompt and an answer.`)
      if (!st.question) continue   // a map-only stop (Will's cold stop): the clue is the whole stop.
      const q = st.question
      qOk(q, w)
      if (!q.doc || !docs.has(`${q.doc.casefile}/${q.doc.n}`)) cf(`${w}: the question's document (${q.doc ? `${q.doc.casefile}/${q.doc.n}` : 'none'}) isn't in this unit's Doc Assist.`)
      if (!st.evidence) cf(`${w}: one evidence line for the warrant.`)
    }
    for (const [ai, a] of acts.entries()) {
      if (!a.door) continue
      const d = a.door, w = `act ${ai + 1} door`
      if (!d.place || !d.year) cf(`${w}: a place and a year.`)
      qOk(d.question || {}, w)
      if (!(d.docs || []).length || (d.docs || []).some(x => !docs.has(`${x.casefile}/${x.n}`))) cf(`${w}: its documents aren't all in this unit's Doc Assist.`)
      if (pk.meter && (!(d.ratified || []).length || !d.short || !String(d.short).includes('{n}'))) cf(`${w}: with a meter, the door needs ratified lines and a short line carrying {n}.`)
    }
    const student = JSON.stringify({ ...pk, final: { task: pk.final?.task } }).replace(/"_[^"]*":\s*"[^"]*"/g, '')
    if (C_SCORE.test(student)) cf('something reads like a score or a clock.')
  }
}

console.log(`\n${fails} fail (live) - ${warns} warn/dark`)
if (!fails) console.log('Everything a student can reach today passes.')
process.exit(fails || process.exitCode ? 1 : 0)
