# Builds the US 11.2 reference rooms, THE MACHINE and THE AMENDMENTS, from Sam's words files, read in place,
# never retyped (Josh, 2026-10-15). Every student-facing value comes from those files; this script only
# reshapes them into the room's fields (layer 1 cards, layer 2 tap items).
# Sources (Danny clean; BK 15:12 "all else approved", Room Check Bless):
#   us11r-curriculum/skills/machine/machine_words.py      md5 9f189159... (Danny-cleared 10/16 10:34)
#   us11r-curriculum/skills/amendments/amendments_words.py md5 5460e6ba...
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
    # Three branches, not four cards (BK 2026-10-15 20:53: "we have three branches ... congress is two parts ...
    # but its still one branch"). Congress is one card: its House and Senate cells side by side (split), and the rows
    # the chart prints once across both houses (BOTH HOUSES, TOGETHER; WHO CAN STOP IT) print once, across the card.
    # The branch names are the chart's own column heads (BRANCHES); House and Senate are CARDS' titles.
    title = {col: t for (t, col, both) in w.CARDS}
    stop_label = w.CHART[-1][0]
    def rows_for(col):
        return [{"label": label, "lines": list(cells[col - 1])} for (label, *cells) in w.CHART if label != stop_label]
    NAMES = getattr(w, 'BRANCH_NAMES', None) or w.BRANCHES     # BK 21:31: Legislative / Executive / Judicial, in Sam's words when they land
    WHO = getattr(w, 'BRANCH_WHO', None) or [None, None, None]
    congress = {"head": NAMES[0], "who": WHO[0], "kicker": [w.JOB[0], w.JOB_SUB[0]],
                "split": [{"head": title[1], "rows": rows_for(1)}, {"head": title[2], "rows": rows_for(2)}],
                "rows": [{"label": w.CONGRESS_BOTH[0], "lines": [w.CONGRESS_BOTH[1]]},
                         {"label": stop_label, "lines": list(w.CHART[-1][1])}]}
    if getattr(w, 'CONGRESS_WHY', None):   # Sam's callout, when his words land (BK 20:53 "maybe a callout as to why")
        congress["callout"] = {"head": getattr(w, 'CONGRESS_WHY_HEAD', None), "lines": list(w.CONGRESS_WHY) if isinstance(w.CONGRESS_WHY, (list, tuple)) else [w.CONGRESS_WHY]}
    cards = [congress] + [{"head": NAMES[b], "who": WHO[b], "kicker": [w.JOB[b], w.JOB_SUB[b]],
                           "rows": [{"label": label, "lines": list(cells[col - 1])} for (label, *cells) in w.CHART]}
                          for (b, col) in ((1, 3), (2, 4))]
    # The three buildings behind the cards (BK 2026-10-15 21:51; Sam's spec 21:56): Carol M. Highsmith Archive, Library of
    # Congress, public domain; pulled by BK from the pages Josh linked (10/16 09:03). Decorative: the card's words carry the meaning.
    BUILDINGS = [
      {"src": "content/room-us11r-11.2-machine-legislative.webp", "_source": "Carol M. Highsmith, \"U.S. Capitol building, Washington D.C.\" Photographs in the Carol M. Highsmith Archive, Library of Congress, Prints and Photographs Division. No known restrictions on publication. https://www.loc.gov/pictures/item/2011630843/"},
      {"src": "content/room-us11r-11.2-machine-executive.webp", "_source": "Carol M. Highsmith, \"The White House, Washington, D.C.\" Carol M. Highsmith's America, Library of Congress, Prints and Photographs Division. No known restrictions on publication. https://www.loc.gov/resource/highsm.04961/"},
      {"src": "content/room-us11r-11.2-machine-judicial.webp", "_source": "Carol M. Highsmith, \"U.S. Supreme Court building, Washington, D.C.\" Photographs in the Carol M. Highsmith Archive, Library of Congress, Prints and Photographs Division. No known restrictions on publication. https://www.loc.gov/resource/highsm.11889/"},
    ]
    for c, b in zip(cards, BUILDINGS): c["image"] = b
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
