# QUARANTINE — 29 stimulus images pulled OUT of `public/` before the first deploy
_Josh (flashpoint) · 2026-09-18 · **nothing deleted. Moved, and reversible with one command.**_

## What happened

`builds/thearena/public/content/` held **29 stimulus PNGs** left over from the v1 shell, which
bound twelve hard-coded stations. **The v2 shell references none of them** — verified, zero
matches for `/content/` in `src/App.jsx`.

**Anything inside `public/` is published verbatim by Netlify at a guessable URL.** So the first
time the Arena deploys, all 29 go onto the public internet whether or not a page links them.

## Why that is a gate failure and not housekeeping

**Nine of them carry the `0626` prefix — the NYSED released-exam corpus.** Will's 09-11 pass on
the Global bank states the rule for its twin catalog: `_catalog_g0626.json`'s `license_default`
**is the reproduction-for-profit clause**, which is why it is a separate file, and *"assume
nothing in it travels to a public surface without BK's ruling per item."*

This desk put four gates in writing and is bound by them:

1. The Arena inherits `blessed`. **Unblessed does not travel.**
2. `license.this_file` is filtered **per crop**, never wholesale off a catalog default.
3. A crop flagged do-not-travel does not travel.
4. Specific crops are named before anything is pulled.

**All four are violated by a deploy of `public/content/` as it stood.** Not one of the 29 has
been checked against `license.this_file`. Sam's 09-09 reply says twelve Unit 1 crops are
unblessed and **one is flagged do-not-travel** — this desk cannot tell from here whether that
crop is among these files, which is itself the answer: unverified means it does not ship.

The nine `0626` files:
```
unit02-0626-cle-doc1-wood.png          unit02-0626-cle-doc2a-ritchie.png
unit02-0626-cle-doc2b-shays-engraving.png  unit02-0626-cle-doc5-monk.png
unit02-0626-cle-doc6-obama-2016.png    unit09-0626-seq2-doc1-clifford-1965.png
unit09-0626-seq2-doc2-lbj-1965.png     unit10-0626-seq1-doc1-heumann-1988.png
unit10-0626-seq1-doc2-bush-ada-1990.png
```
The other twenty are not exonerated — they are simply **unverified**, which under gate 2 is the
same thing.

## What was done

Moved `public/content/` → `_content-quarantine/content/`. **Nothing deleted** — this desk stages
and never burns (House Rules §8). The build is unaffected: nothing referenced them.

Side effect worth having: the published payload drops from **8.7 MB to about 1.1 MB.**

## How they come back — the right way

Not by moving the folder back. When a rep package binds a stimulus, the **named** crop is
copied into `public/content/` after it clears all four gates, per crop, with `blessed` and
`license.this_file` checked individually. That is the pipeline the gates describe, and it was
never run on these files because they predate the manifest.

To restore everything unchecked (**do not do this before a deploy**):
```
mv _content-quarantine/content public/content
```

## For BK
No action needed to keep building. **This only matters at deploy, and it matters absolutely.**
If any of the 29 should ship, name them and this desk runs them through the gates per crop.
