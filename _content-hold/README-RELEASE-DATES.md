# HELD CONTENT — not in `public/`, on purpose
_Josh · 2026-09-18, kept current_

**`published: false` in the manifest hides the CARD. It does not stop the FILE being served.**
Anything inside `public/` is published verbatim by Netlify at a guessable URL. That is the defect
that put 29 unlicensed crops one deploy away from the open internet on 2026-09-18, and it is the
same defect in any medium. **A file under a hold lives HERE, outside `public/`, until its date or
its approval.**

| file | state | why |
|---|---|---|
| `stimulus-gs10r-10-1.json` | **HELD to 2026-09-22** | Its four items are on the 10.1 exam. Will's students sit it **Monday 2026-09-21**. Serving the file before Tuesday hands them the exam, card hidden or not. |
| `RELEASED-2026-09-18-stimulus-11-1.json` | **RELEASED — do not re-use this copy** | Approved by BK 2026-09-18. The live file is `public/content/stimulus-11-1.json`. **This copy is kept only as the record of what was held and is now stale** — prefixed RELEASED so no later session reads it as an active hold. Edit the one in `public/content/`. |
| `bkbook-review.json` | working note | Crop metadata extracted for BK's 2026-09-18 approvals sheet. Not content; not served. |

## To release something held
```
cp _content-hold/<file> public/content/
```
then flip `published: true` on its activity in `arena.manifest.json` and rebuild.
**Both steps.** One without the other either serves an unlinked file or shows a card pointing at
nothing.

_Josh ships. BK rules. Only BK burns._
