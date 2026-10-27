// Desk talk never reaches a kid. (Josh, 2026-10-27, on BK's call: "i see a lot of
// 'leo' and 'danny' references...that is unacceptable.")
//
// strip-notes.mjs drops every `_` key from what Cloudflare serves. This catches the
// other half: a desk aside written INSIDE a field the page reads - a citation with
// "Danny checks." appended, an attire note ending "(Attire note: Leo's ... Danny's
// gate.)", an alt text that is really a note to another desk.
//
// It matches the ASIDE, not the name. "Sam 8" in a 1764 inventory of enslaved
// people is a child, not a desk, and it stays. What marks an aside is a desk name
// doing desk work: a possessive before a desk noun, a desk verb, or a preposition
// handing something to a desk.
//
// It removes; it never rewrites. A parenthetical holding an aside goes; a sentence
// holding an aside goes; a field that was nothing but an aside is dropped rather
// than served empty. Whatever is left is the author's own words, untouched.
//
// Then it checks its work. If an aside survives in a served file the build FAILS.
// That is the point: this class of bug does not get to ship twice.
import fs from 'node:fs'
import path from 'node:path'

const DESKS = ['Danny', 'Leo', 'Sam', 'Will', 'CJ', 'Nancy', 'Toby', 'Kate', 'Josh']
const N = `(?:${DESKS.join('|')})`
const P = `(?:'s|’s)`
const ASIDE = new RegExp([
  `\\b${N}${P}\\s+(?:gate|call|ruling|order|note|notes|proposal|prompt|prompts|desk|read|pass|fix|fixlist|md5|hash)\\b`,
  `\\b${N}${P}?\\s+(?:checks?|checked|checking|confirms?|confirmed|flagged|flags|rules?|ruled|cleared|clears|wrote|writes|owes|owns|building|porting|wiring|shipping|deploying|queued|has it|to build)\\b`,
  `\\b(?:per|with|to|from|through|via|ask|asks|asked|cc)\\s+${N}\\b`,
  `\\b${N}${P}\\s+and\\s+BK${P}`,
  `\\bAttire note:`,
].join('|'), 'i')

let cutParen = 0, cutSent = 0, dropped = 0, files = 0

const scrubString = s => {
  // 1. parentheticals and bracketed asides
  let out = s.replace(/\s*[([][^()[\]]*[)\]]/g, m => (ASIDE.test(m) ? (cutParen++, '') : m))
  // 2. any sentence holding an aside, wherever it sits
  const sentences = out.match(/[^.!?]+(?:[.!?]+["'’)\]]*|$)/g)
  if (sentences) {
    const kept = sentences.filter(x => (ASIDE.test(x) ? (cutSent++, false) : true))
    out = kept.join('')
  }
  return out.replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1').replace(/[\s;,]+$/, '').trim()
}

const walk = o => {
  if (Array.isArray(o)) return o.map(walk).filter(v => v !== undefined)
  if (o && typeof o === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === 'string' && ASIDE.test(v)) {
        const s = scrubString(v)
        if (!s) { dropped++; continue }
        out[k] = s
      } else out[k] = walk(v)
    }
    return out
  }
  return o
}

const survivors = []
const check = (o, file, p = '') => {
  if (Array.isArray(o)) return o.forEach((v, i) => check(v, file, `${p}[${i}]`))
  if (o && typeof o === 'object') return Object.entries(o).forEach(([k, v]) => check(v, file, `${p}.${k}`))
  if (typeof o === 'string' && ASIDE.test(o)) survivors.push(`${file}${p}: ${o.slice(0, 140)}`)
}

const run = dir => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) run(p)
    else if (e.name.endsWith('.json')) {
      const before = cutParen + cutSent + dropped
      const data = walk(JSON.parse(fs.readFileSync(p, 'utf8')))
      if (cutParen + cutSent + dropped > before) { fs.writeFileSync(p, JSON.stringify(data)); files++ }
      check(data, p.replace(/^dist\//, ''))
    }
  }
}
run('dist')

if (survivors.length) {
  console.error(`scrub-desk: FAIL - ${survivors.length} desk aside(s) still in served content:`)
  survivors.slice(0, 20).forEach(s => console.error('   ' + s))
  process.exit(1)
}
console.log(`scrub-desk: ${cutParen} parentheticals + ${cutSent} sentences cut, ${dropped} desk-only fields dropped, across ${files} served files; 0 asides remain`)
