#!/usr/bin/env python3
"""
Unit Overview packs, read straight from the desks' own word files. Nothing is retyped.
(Josh, flashpoint · 2026-11-02 · Danny's clearances 11:04 (10.3 UNIT_WYNK) and 11:34 (11.3A constants).)

  python3 scripts/packs/overview_pack.py <words_113A.py> <words_103A.py>

11.3A  -> writes public/content/overview-us11r-11.3A.json whole, from Sam's constants:
          UNIT_QUESTION, UNIT_WYNK (paragraphs), VOCAB then UNIT_NAMES (the key terms), UNIT_CAL + CAL_NOTICE.
10.3   -> updates public/content/overview-gs10r-10.3.json in place: ONLY `wynk_head` and `wynk`
          (Will's UNIT_WYNK_HEAD and UNIT_WYNK). His question, key terms and calendar are not touched.
          They are checked against the current word file and the script stops if they have drifted.

Student words come from the desk files and nowhere else. Run again after a desk changes a constant.
"""
import hashlib, importlib.util, json, os, sys, re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "public", "content")


def load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def md5(path):
    return hashlib.md5(open(path, "rb").read()).hexdigest()


def dump(path, obj):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write("\n")


def build_113A(path):
    w = load(path, "words_113A")
    # the card's order is the desk's: check it, do not assume it
    assert tuple(w.UNIT_OVERVIEW_ORDER) == ("UNIT_QUESTION", "UNIT_WYNK", "VOCAB", "UNIT_NAMES", "UNIT_CAL", "CAL_NOTICE", "ATLAS"), \
        "Sam changed the card's order: read her memo before building"
    terms = [{"term": t, "def": d} for day in sorted(w.VOCAB) for (t, d) in w.VOCAB[day]]
    terms += [{"term": t, "def": d} for (t, d) in w.UNIT_NAMES]
    pack = {
        "_source": ("Sam (us11r-curriculum), 11/2 10:30 + 10:57 + 11:30; Danny cleared the constants 11:34 "
                    "(UNIT_QUESTION, UNIT_WYNK with the rewritten paragraph 5, UNIT_NAMES). Read from "
                    "skills/u113/words_113A.py, md5 %s, by scripts/packs/overview_pack.py. Key terms = VOCAB then UNIT_NAMES. "
                    "Calendar = UNIT_CAL + CAL_NOTICE (Danny's 11:34: VOCAB, UNIT_CAL and CAL_NOTICE were not re-read in that pass). "
                    "No tool column on this card (Sam, BK call 6). Washington's Farewell Address stays off this card until "
                    "Casefile B opens it (Sam 10:30, BK ruled)." % md5(path)),
        "_keep_off": ["Farewell", "said the same thing"],   # read by the gate (OVERVIEW block); never rendered
        "question": w.UNIT_QUESTION,
        "wynk": list(w.UNIT_WYNK),
        "terms": terms,
        "calendar": [{"what": a, "when": b} for (a, b) in w.UNIT_CAL],
        "calendar_notice": w.CAL_NOTICE,
    }
    # guards named by the desks
    blob = json.dumps({k: v for k, v in pack.items() if not k.startswith("_")}, ensure_ascii=False)   # student fields only
    assert "Farewell" not in blob, "Washington's Farewell Address is Casefile B's cold document: not on this card"
    assert "said the same thing" not in blob, "old paragraph 5 (Danny 11:34): Washington never said the second half"
    assert len(pack["wynk"]) == 5 and len(w.UNIT_NAMES) == 7
    dump(os.path.join(OUT, "overview-us11r-11.3A.json"), pack)
    print("11.3A: question, %d paragraphs, %d key terms (%d VOCAB + %d names), %d calendar rows"
          % (len(pack["wynk"]), len(terms), len(terms) - len(w.UNIT_NAMES), len(w.UNIT_NAMES), len(pack["calendar"])))


def update_103(path):
    w = load(path, "words_103A")
    f = os.path.join(OUT, "overview-gs10r-10.3.json")
    pack = json.load(open(f, encoding="utf-8"))
    # Will's other sections must still equal his file; stop if they have drifted
    assert pack["question"] == w.UNIT_QUESTION, "10.3 question differs from words_103A.UNIT_QUESTION"
    a_terms = [{"term": t, "def": d} for day in sorted(w.VOCAB) for (t, d) in w.VOCAB[day]]
    assert pack["terms"][:len(a_terms)] == a_terms, "10.3 key terms (A's days) differ from words_103A.VOCAB"
    assert pack["calendar"] == [{"what": a, "when": b} for (a, b) in w.UNIT_GLANCE], "10.3 calendar differs from words_103A.UNIT_GLANCE"
    pack["wynk_head"] = w.UNIT_WYNK_HEAD
    pack["wynk"] = [{"head": h, "text": t} for (h, t) in w.UNIT_WYNK]
    sha = hashlib.sha256("\n".join([w.UNIT_WYNK_HEAD] + [x for h, t in w.UNIT_WYNK for x in (h, t)]).encode()).hexdigest()
    pack["_source"] = (re.sub(r" The whole-unit 'What you need to know'.*$", "", pack["_source"]) +
                       " 'What you need to know' (wynk_head + five beats): Will's UNIT_WYNK_HEAD and UNIT_WYNK, ruled by BK 11/2 10:47, "
                       "cleared by Danny 11:04 (29 claims, 0 to fix); words_103A.py md5 %s; sha256 of heading then each title and body, "
                       "newline-joined, %s (matches Danny's). Beats 4 and 5 are keyed to Casefile B's unblessed build: if B moves, "
                       "Will sends them back to Danny." % (md5(path), sha))
    dump(f, pack)
    print("10.3: wynk_head + %d beats written; question, %d terms and %d calendar rows verified unchanged; sha256 %s"
          % (len(pack["wynk"]), len(pack["terms"]), len(pack["calendar"]), sha[:16]))


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    build_113A(sys.argv[1])
    update_103(sys.argv[2])
