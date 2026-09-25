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
try {
  const m = JSON.parse(fs.readFileSync(path.resolve('public/arena.manifest.json'), 'utf8'))
  for (const c of m.courses || []) {
    if ((c.status ?? 'open') === 'building') continue
    for (const st of c.stations || []) if (st.published && st.content_ref) LIVE.add(String(st.content_ref).replace(/^content\//, ''))
    for (const u of c.units || []) {
      if (!u.published) continue
      for (const a of u.activities || []) if (a.published && a.content_ref) LIVE.add(String(a.content_ref).replace(/^content\//, ''))
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
    const hit = txt.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.? \d{1,2}\b|\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/)
    if (hit) fail(f, `unit_brief: looks like a calendar date ('${hit[0]}'). Unit dates live in Classroom, never the Arena.`)
  } else {
    fail(f, `ladder type '${type}' has no renderer in the shell.`)
  }
}

console.log(`CONTENT GATE — ${LIVE.size} package(s) live and gated; the rest reported as 'dark'\n`)
for (const f of fs.readdirSync(CONTENT).filter(f => f.endsWith('.json')).sort()) {
  let d
  try { d = JSON.parse(fs.readFileSync(path.join(CONTENT, f), 'utf8')) }
  catch (e) { fail(f, `not valid JSON - ${e.message}`); continue }
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
console.log(`\n${fails} fail (live) - ${warns} warn/dark`)
if (!fails) console.log('Everything a student can reach today passes.')
process.exit(fails || process.exitCode ? 1 : 0)
