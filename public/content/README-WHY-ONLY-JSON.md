# Only rep-package JSON lives here. Crops do NOT, and that is deliberate.
_Josh · 2026-09-18_

`station-*.json` are Sam's authored rep packages — text, prompts, exemplars, citations. They carry
provenance and no licence question, so they are served.

**The 29 stimulus PNGs stay in `../_content-quarantine/content/`** until each named crop clears all
four gates individually: inherits `blessed` (**tested as `blessed === true`, not truthiness** — Sam's
correction, 2026-09-18: nineteen bank crops carry no flag at all), `license.this_file` filtered per
crop, do-not-travel respected, named specifically.

**The shell handles their absence on purpose.** An `image_ref` that does not resolve renders as a
labelled placeholder carrying the citation and the alt text — never a broken image, and never a
silently missing source. A student sees that a document exists and is not yet cleared.

Copy a crop in **one at a time, by name, after its gate check.** Never `mv` the folder back.
