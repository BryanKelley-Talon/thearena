# Builds the US 11.2 reference rooms, THE MACHINE and THE AMENDMENTS, from Sam's words files, read in place,
# never retyped (Josh, 2026-10-15). Every student-facing value comes from those files; this script only
# reshapes them into the room's fields (layer 1 cards, layer 2 tap items).
# Sources (Danny clean; BK 15:12 "all else approved", Room Check Bless):
#   us11r-curriculum/skills/machine/machine_words.py      md5 9a89d26c...
#   us11r-curriculum/skills/amendments/amendments_words.py md5 5eb944a6...
# Usage: python3 scripts/packs/civics_pack.py machine <machine_words.py> > public/content/room-us11r-11.2-machine.json
#        python3 scripts/packs/civics_pack.py amendments <amendments_words.py> > public/content/room-us11r-11.2-amendments.json
import importlib.util, json, sys, hashlib, datetime, zoneinfo
kind, src = sys.argv[1], sys.argv[2]
spec = importlib.util.spec_from_file_location('w', src); w = importlib.util.module_from_spec(spec); spec.loader.exec_module(w)
md5 = hashlib.md5(open(src, 'rb').read()).hexdigest()
today = datetime.datetime.now(zoneinfo.ZoneInfo('America/New_York')).strftime('%Y-%m-%d')

def items(rows):
    return [{"situation": s, "question": q, "answer": a, "wrong": list(wr), "why": why, "principle": p} for (s, q, a, wr, why, p) in rows]

if kind == 'machine':
    rowv = {label: cells for (label, *cells) in w.CHART}           # label -> [House, Senate, President, Court]
    cards = []
    for (title, col, both) in w.CARDS:
        b = 0 if col in (1, 2) else col - 2                        # BRANCHES / JOB index: Congress, President, Court
        rows = []
        for (label, *cells) in w.CHART:
            lines = cells[col - 1]
            if not lines and label == w.CHART[-1][0] and col == 2:  # the chart prints Congress's checks once, across both houses
                lines = cells[0]
            rows.append({"label": label, "lines": list(lines)})
            if both and label == "ITS POWERS":
                rows.append({"label": w.CONGRESS_BOTH[0], "lines": [w.CONGRESS_BOTH[1]]})
        cards.append({"head": title, "kicker": [w.JOB[b], w.JOB_SUB[b]], "rows": rows})
    pack = {
      "id": "room-us11r-11.2-machine", "course": "us11r", "unit": "11.2", "slug": "machine",
      "title": w.TITLE, "sub": w.SUB,
      "layer1": {"title": w.LAYER1_TITLE, "line": w.LAYER1_LINE, "groups": [{"title": None, "years": None, "cards": cards}],
                 "foot": [w.FOOT_LAW, w.FOOT_NOTE]},
      "layer2": {"title": w.LAYER2_TITLE, "line": w.LAYER2_LINE, "items": items(w.SCENARIOS), "done": w.SCENARIO_DONE},
    }
elif kind == 'amendments':
    groups = [{"title": t, "years": y, "cards": [{"head": n, "kicker": [yr], "rows": [{"label": None, "lines": [line]}],
                                                  "tags": [p] + (["VOTE"] if n in w.VOTE else [])} for (n, yr, line, p) in rows]}
              for (t, y, rows) in w.GROUPS]
    pack = {
      "id": "room-us11r-11.2-amendments", "course": "us11r", "unit": "11.2", "slug": "amendments",
      "title": w.TITLE, "sub": w.SUB, "how": w.HOW, "number_cards": True,
      "layer1": {"title": w.LAYER1_TITLE, "line": w.LAYER1_LINE, "groups": groups, "foot": [w.FOOT]},
      "layer2": {"title": w.LAYER2_TITLE, "line": w.LAYER2_LINE, "items": items(w.SCENARIOS_BOR), "done": w.SCENARIO_DONE},
    }
else:
    sys.exit('kind must be machine or amendments')
pack["_built"] = f"Josh, {today}, by scripts/packs/civics_pack.py from Sam's {src.split('/')[-1]} (md5 {md5})."
json.dump(pack, sys.stdout, ensure_ascii=False, indent=1); sys.stdout.write("\n")
