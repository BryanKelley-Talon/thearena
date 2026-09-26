# HELD CONTENT — not in `public/`, on purpose
_Josh · 2026-09-18, kept current_

**`published: false` in the manifest hides the CARD. It does not stop the FILE being served.**
Anything inside `public/` is published verbatim by Netlify at a guessable URL. That is the defect
that put 29 unlicensed crops one deploy away from the open internet on 2026-09-18, and it is the
same defect in any medium. **A file under a hold lives HERE, outside `public/`, until its date or
its approval.**

| file | state | why |
|---|---|---|
| `RELEASED-2026-09-26-stimulus-gs10r-10-1-4item.json` | **RELEASED — stale record** | The 09-18 four-item hold. Will released the set 2026-09-26; the live file is `public/content/stimulus-gs10r-10-1.json` (his FULL15, filed as-is). |
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
