# Builds the NINE STATES chase pack from Sam's words file, read in place, never retyped (Josh, 2026-10-14).
# Source: us11r-curriculum/skills/arena-chase/nine_states_words.py (Danny cleared 10/14 08:28, md5 c98913ed...).
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
    if s.get("nearMiss"): out["nearMiss"] = s["nearMiss"]
    return out

D = w.DOOR
door = {"place": D["place"], "year": D["year"], "text": D["text"], "question": q(D["question"], docs=D["docs"]),
        "docs": [{"casefile": a, "n": b} for a, b in D["docs"]], "ratified": D["ratified"], "short": D["short"], "short_one": w.SHORT_ONE}
pack = {
  "_built": f"Josh, 2026-10-14, by scripts/packs/nine_states_pack.py from Sam's nine_states_words.py (md5 {md5}); Danny cleared 10/14 08:28 (three cold readers 10/13; 20 of 20 fixed or held on BK's word). Act I words BK 10/6 22:41; Act II and the final key BK 10/13 11:27; stamp PARDONED (call 2).",
  "id": "chase-us11r-11.2", "course": "us11r", "unit": "11.2", "title": w.TITLE,
  "suspect": {"name": "Daniel Shays", "portrait": "content/chase-us11r-11.2-suspect.webp",
              "portrait_alt": w.PORTRAIT["alt"], "portrait_src": w.PORTRAIT["src"]},
  "intro": w.INTRO,
  "meter": w.METER,
  "cold": [w.COLD["warm"], w.COLD["cooling"], w.COLD["cold"]], "fresh": w.COLD["fresh"],
  "acts": [{"title": w.ACT_TITLES[0], "stops": [stop(s) for s in w.STOPS], "door": door},
           {"title": w.ACT_TITLES[1], "intro": w.ACT2_INTRO, "stops": [stop(s) for s in w.STOPS_ACT2]}],
  "final": {"prompt": w.FINAL["task"], "key_words": w.FINAL["key_words"], "stamp": w.FINAL["stamp"], "after": w.FINAL["card"]},
  "end": {"photo": "content/chase-us11r-11.2-end.webp", "alt": w.GRAVE_ALT, "credit": w.END["credit"], "lines": w.END["lines"],
          "licence": {"name": "CC BY-SA 4.0", "sellable": False}},
  "reflection": w.REFLECTION,
  "_paper_only": "VERDICT lines 1-2 (rebel or patriot) stay on the paper Case File (BK 10/13 11:27). The CF_* words are the paper sheet's, not the screen's.",
}
json.dump(pack, sys.stdout, ensure_ascii=False, indent=1); sys.stdout.write("\n")
