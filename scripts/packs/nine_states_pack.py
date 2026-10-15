# Builds the NINE STATES chase pack from Sam's words file, read in place, never retyped (Josh, 2026-10-14).
# Source: us11r-curriculum/WORK/Unit_02/nine-states-taps-2026-10-14/nine_states_words_taps_v3.py (Danny CLEAN 10/15 13:41, md5 ba771521...),
# the same bytes Sam now keeps at skills/arena-chase/nine_states_words.py. (Was the 10/14 words file, md5 c98913ed..., cleared 08:28.)
# v3 is the taps shape (the Timekeeper's fix): a principle tap at every stop (stop.issue), TALLY, and a final kids earn from the tally.
# Every student-facing value comes from that file; this script only reshapes it into the engine's fields (pack shape, Josh 10/7).
# Usage: python3 scripts/packs/nine_states_pack.py <path/to/nine_states_words.py> > public/content/chase-us11r-11.2.json
import importlib.util, json, sys, hashlib
src = sys.argv[1]
spec = importlib.util.spec_from_file_location('w', src); w = importlib.util.module_from_spec(spec); spec.loader.exec_module(w)
md5 = hashlib.md5(open(src, 'rb').read()).hexdigest()

def q(c, doc=None, docs=None):
    out = {"stem": c["prompt"], "type": c["type"], "options": c["options"], "answer": c["answer"], "hints": c["hints"]}
    if c.get("why"): out["why"] = c["why"]
    if doc: out["doc"] = {"casefile": doc[0], "n": doc[1]}
    if docs: out["docs"] = [{"casefile": a, "n": b} for a, b in docs]
    return out
def ask(c):
    out = {"prompt": c["prompt"], "type": c["type"], "options": c["options"], "answer": c["answer"], "hints": c["hints"]}
    if c.get("why"): out["why"] = c["why"]
    return out
def stop(s):
    out = {"id": s["id"], "place": s["place"], "year": s["year"], "story": s["shays"],
           "clue": {"text": s["clue"]["text"], "tool": s["clue"]["tool"], "link": s["clue"]["link"], "ask": ask(s["clue"]["ask"])},
           "question": q(s["question"], doc=s["doc"]), "evidence": s["evidence"]}
    if s.get("issue"): out["issue"] = s["issue"]
    if s.get("nearMiss"): out["nearMiss"] = s["nearMiss"]
    return out

D = w.DOOR
door = {"place": D["place"], "year": D["year"], "text": D["text"], "question": q(D["question"], docs=D["docs"]),
        "docs": [{"casefile": a, "n": b} for a, b in D["docs"]], "ratified": D["ratified"], "short": D["short"], "short_one": w.SHORT_ONE}
pack = {
  "_built": f"Josh, 2026-10-15, by scripts/packs/nine_states_pack.py from Sam's nine_states_words_taps_v3.py (md5 {md5}); Danny CLEAN 10/15 13:41 (taps v2 check 10/14 21:19: 13 items, last 2 closed in v3). Taps wording BK 10/14 20:54; Act I words BK 10/6 22:41; Act II BK 10/13 11:27; stamp PARDONED.",
  "id": "chase-us11r-11.2", "course": "us11r", "unit": "11.2", "title": w.TITLE,
  "suspect": {"name": "Daniel Shays", "portrait": "content/chase-us11r-11.2-suspect.webp",
              "portrait_alt": w.PORTRAIT["alt"], "portrait_src": w.PORTRAIT["src"]},
  "intro": w.INTRO,
  "meter": w.METER,
  "cold": [w.COLD["warm"], w.COLD["cooling"], w.COLD["cold"]], "fresh": w.COLD["fresh"],
  "acts": [{"title": w.ACT_TITLES[0], "stops": [stop(s) for s in w.STOPS], "door": door},
           {"title": w.ACT_TITLES[1], "intro": w.ACT2_INTRO, "stops": [stop(s) for s in w.STOPS_ACT2]}],
  "tally": w.TALLY,
  "final": {k: w.FINAL[k] for k in ("prompt", "key_words", "hints", "after_by_answer", "wrong_feedback", "wrong_default", "stamp") if k in w.FINAL},
  # The card button at the last door (BK 2026-10-15 14:08 "Add one"; 14:13 "yes" to the label in chat). It opens US Doc Assist 11.2's q4_card.
  # Not in Sam's words file yet; it moves there when Sam next touches FINAL (pill.label).

  "end": {"photo": "content/chase-us11r-11.2-end.webp", "alt": w.GRAVE_ALT, "credit": w.END["credit"], "lines": w.END["lines"],
          "licence": {"name": "CC BY-SA 4.0", "sellable": False}},
  "reflection": w.REFLECTION,
  "_paper_only": "VERDICT lines 1-2 (rebel or patriot) stay on the paper Case File (BK 10/13 11:27). The CF_* words are the paper sheet's, not the screen's.",
}
pack["final"]["pill"] = w.FINAL.get("pill") or {"label": "Civic Principles card"}
json.dump(pack, sys.stdout, ensure_ascii=False, indent=1); sys.stdout.write("\n")
