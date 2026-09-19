# FLASHPOINT — BUILD ORDER · Jul 7, 2026
**Supersedes every scattered prompt from today. This is the record.**
Three subdomains today, all on flashpointhistory.com: `early-republic` · `last-compromise` · `thearena`.
Rhythm for all three: **build local → BK reviews → deploy.** Never deploy unreviewed. Accents come from the token file, never ad-hoc.

---

## LOCKED — do not re-decide (this is why the palette exists)
- **Era accents live in `flashpoint-tokens.css` / `.js`** (generated from `flashpoint-accent-palette.html`). Source of truth. No one proposes a raw accent again.
  - 11.2 Forten = `#6B9BD1` (Federal blue) · 11.3 Hayden = `#5AA57B` (antebellum green) · 11.5 = `#C17700` (amber anchor).
- **Canvas = `#16120E`** across all subdomains. Games type = Cinzel / Playfair / Libre Baskerville.
- **Arena = deliberate sub-brand:** Barlow Condensed / Outfit + amber, on the *shared* `#16120E` canvas + shared tokens. Not rebuilt in serif.
- Every era accent already clears 4.5:1 vs the ink — never substitute a darker shade.

---

## STEP 0 · Tokens (once, first)
- Add `flashpoint-tokens.css` + `flashpoint-tokens.js` to the canonical `flashpoint-template` under `src/tokens/`.
- `@import` the CSS at the top of each game's `index.css`.
- Regenerate `docs/palette.html` FROM the tokens — keep it as the browsable swatch sheet, now downstream of the tokens (human view, not the origin).

## STEP 1 · Games — build local, NO deploy
Clone the template twice. Fill each `gameData` **verbatim** from its brief (chapters, decisions, options, consequences, meter deltas, verdicts — keys are in the brief's BUILD SPEC). Do not improvise content.
- **Forten** — brief `flashpoint-brief-11.2-early-republic.docx` · `accentFor("11.2")` = `#6B9BD1` · slug `early-republic-game` · save `early_republic_save_v1`
- **Hayden** — brief `flashpoint-brief-11.3-last-compromise.docx` · `accentFor("11.3")` = `#5AA57B` · slug `last-compromise-game` · save `last_compromise_save_v1`

Match the live `1900` engine's `gameData` shape exactly. Two fields the briefs don't carry — **author from each chapter's own content, same realness rules**:
1. `quote` / `quoteSource` — a real, documented, public-domain epigraph tied to that chapter's protagonist/event.
2. `hingeQuestion` — a Regents-style MC question with `correct` + explanation, built from the chapter's decision.

`getVerdict()` keyed to the highest gauge at end, tie → first verdict listed. Apply the `#root` centering fix in `src/index.css`. Then `npm run dev` each, confirm it plays **start → verdict**. **Stop. Report preview URLs. No git, no Netlify, no DNS.**

## STEP 2 · Arena — build local, NO deploy
Start from the existing Arena `App.jsx`. Swap its canvas var to `#16120E` and import the tokens (keep Barlow/Outfit + amber). Then:
1. Two-stage entrance: `frontdoor` splash (`arena-main-splash.html` — TR greeter, quote, purpose, how-to-use) → `rooms` picker (`arena-landing-splash.html` — three pop-outs → `circuit` / `trainers` / `recovery`).
2. **Recovery Room** as a real screen: stateless click-to-check `mc_set` trainer; clean empty state ("packs load as each unit is audited"); reads `mc_set` JSON by reference when present.
3. Swap StationScreen → `StationScreen.v1.1.jsx` (compare mechanic).
4. Drop `station-01-contextualization.json` + `station-05-sourcing-hipp.json` into `/content`; Circuit binds by reference.
5. Fix "6 tools" → "7 tools." Trainer's Room stays at its 7 tools (Part I/II/III taxonomy expansion is a later data-only pass — interface doesn't change).
6. `#root` fix. `npm run dev`, confirm frontdoor → rooms → each room renders + compare mechanic runs on Station I. **Stop. Report URL.**

## STEP 3 · Review (BK, local — before any deploy)
Per game: play one full path start→verdict · spot-check 3–4 decisions vs the brief (consequence + meter deltas) · read the epigraphs + hinge answers (only new-authored content — check quotes are real, answers correct) · protagonist + accent correct (Forten blue / Hayden green) · holds at ~380px.
Arena: front door loads · all three room doors route · compare runs a real package · holds at phone width.

## STEP 4 · Deploy (per subdomain, after review — walk through together)
GitHub repo → push → Netlify deploy → Cloudflare CNAME **grey-cloud / DNS-only** (never proxied — avoids the SSL cert loop) → Netlify custom domain + SSL. Verify each subdomain renders before calling it done.
