# Builds the US 11.2 reference room THE LANDMARK CASES from Sam's words file, read in place and never
# retyped (Josh, 2026-10-19). Every student-facing value comes from that file; this script only reshapes
# it into the room's fields (layer 1 cards, layer 2 tap items).
# Source (Danny CLEAN 2026-10-16 14:44, 3 readers 38/37/43; BK 12:02 "3 and 4: yes. signed.", 13:19 the name,
# 14:27 the Gibbons and Dred Scott rows):
#   us11r-curriculum/skills/cases/cases_words.py   md5 b799ca27b234e467a36b5ae8d2440eae
# Usage: python3 scripts/packs/cases_pack.py <cases_words.py> > public/content/room-us11r-11.2-cases.json
#
# Two shapes this room adds to the civics room (both carried by src/civics.jsx):
#   · a row line may be {"t": text, "link": "<room>:<card>"} - THE CONSTITUTION row points at the clause's
#     card in THE MACHINE or THE AMENDMENTS, which is where the kid already studied it.
#   · a card may carry "badge" (REGENTS FAVORITE) and "unit", the unit the case opens with.
# One label, LATER, is not a constant in Sam's file: it is the word in his docstring, from BK's 12:02 ruling
# ("plus LATER only where the decision was overturned"). Flagged to Sam and Danny for a constant.
import importlib.util, json, sys, hashlib, datetime, zoneinfo

src = sys.argv[1]
spec = importlib.util.spec_from_file_location('w', src); w = importlib.util.module_from_spec(spec); spec.loader.exec_module(w)
md5 = hashlib.md5(open(src, 'rb').read()).hexdigest()
today = datetime.datetime.now(zoneinfo.ZoneInfo('America/New_York')).strftime('%Y-%m-%d')

ISSUE, DECISION, CONSTITUTION, WHY = w.ROWS
LATER = "LATER"   # BK 2026-10-16 12:02, via the words file's docstring; not yet a constant there.

name = {c[0]: c[1] for c in w.CASES}     # id -> the case's name, for the layer 2 choices

def line(text, link):
    return {"t": text, "link": link} if link else text

cards = []
for (cid, nm, year, unit, favorite, issue, decision, constitution, tag, why, later) in w.CASES:
    rows = [
        {"label": ISSUE, "lines": [issue]},
        {"label": DECISION, "lines": [decision]},
        {"label": CONSTITUTION, "lines": [line(t, lk) for (t, lk) in constitution]},
        {"label": WHY, "lines": [why]},
    ]
    if later:
        rows.append({"label": LATER, "lines": [line(later[0], later[1])]})
    card = {"id": cid, "head": nm, "kicker": [year], "unit": unit, "rows": rows, "tags": [tag]}
    if favorite:
        card["badge"] = w.FAVORITE
    cards.append(card)

# Layer 2: the situation is the whole prompt (layer2.line carries the ask, as Sam wrote it), so an item has
# no separate question. The three choices are case names; the why and the case's own card tag show after a pick.
items = []
for (cid, situation, wrong, why) in w.TAPS:
    tag = next(c[8] for c in w.CASES if c[0] == cid)
    items.append({"situation": situation, "question": None, "answer": name[cid],
                  "wrong": [name[x] for x in wrong], "why": why, "principle": tag})

pack = {
    "id": "room-us11r-11.2-cases", "course": "us11r", "unit": "11.2", "slug": "cases",
    "title": w.TITLE, "sub": w.SUB,
    "card_ids": True,
    "wide_cards": True,     # five prose rows per card: 220px columns squeeze them to a ribbon.
    "layer1": {"title": w.LAYER1_TITLE, "groups": [{"title": None, "years": None, "cards": cards}]},
    "layer2": {"title": w.LAYER2_TITLE, "line": w.LAYER2_LINE, "items": items},
}
pack["_built"] = f"Josh, {today}, by scripts/packs/cases_pack.py from Sam's {src.split('/')[-1]} (md5 {md5})."
json.dump(pack, sys.stdout, ensure_ascii=False, indent=1); sys.stdout.write("\n")
