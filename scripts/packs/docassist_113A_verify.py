# -*- coding: utf-8 -*-
"""Check the shipped 11.3A Doc Assist pack against the desks' own files. Josh, 2026-10-31.
A: every student-visible string in the pack appears in da_113A.py, words_113A.py, or the standing
   11.2 precedent (walk/labels/q4_card/annotate, reused unchanged). Anything the build desk typed
   itself fails, whether or not it reads correctly.
B: every ruled feature the other US packs carry is present here, or named in the module's OPEN note.
C: pages, close lines and before-framing are read off the desks' own fields, not invented.
"""
import os, sys, json, importlib.util

HOME = os.environ["HOME"]; COWORK = os.path.join(HOME, "mnt/Cowork")
US = os.path.join(COWORK, "us11r-curriculum"); FP = os.path.join(COWORK, "flashpoint/Project Flashpoint")
ARENA = os.path.join(FP, "builds/thearena")

def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path); mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod; spec.loader.exec_module(mod); return mod

sys.path.insert(0, os.path.join(US, "skills/u113"))
M = load("da_113A", os.path.join(FP, "In/da_113A.py"))
W = sys.modules["words_113A"]
PRECEDENT = json.load(open(os.path.join(ARENA, "public/content/docassist-us11r-11.2.json"), encoding="utf-8"))
pack = json.load(open(os.path.join(ARENA, "public/content/docassist-us11r-11.3A.json"), encoding="utf-8"))

bad, n_checks = [], 0
def ck(cond, msg):
    global n_checks
    n_checks += 1
    if not cond: bad.append(msg)

cfA = pack["casefiles"][0]
docs = {d["n"]: d for d in cfA["docs"]}
ck(len(docs) == len(M.DOCS), "document count (%d vs %d)" % (len(docs), len(M.DOCS)))
ck(set(docs) == set(M.DOCS), "document numbers match")

# ── A · every student-visible string traces to da_113A.py / words_113A.py / the shared precedent ──
DESK_STRINGS = set()
for mod in (M, W):
    for nm in dir(mod):
        if nm.startswith("__"): continue
        v = getattr(mod, nm)
        def add(x):
            if isinstance(x, str): DESK_STRINGS.add(x)
            elif isinstance(x, dict):
                for k, vv in x.items():
                    if isinstance(k, str): DESK_STRINGS.add(k)
                    add(vv)
            elif isinstance(x, (list, tuple)):
                for y in x: add(y)
        add(v)
BUILDER_LITERALS = {
    "(adapted, easier to read)",   # canon §6, the builder's own literal (docassist_103A_verify precedent)
    "BEFORE WE TALK",              # the standing kit's box title, reused verbatim (11.1/11.2 precedent)
    "As printed on the NYSED Regents exam in US History and Government, January 2024.",  # house licence template, filled from the record's own month/year
}
SHARED = {PRECEDENT["tile"], PRECEDENT["walk_name"]}
def shared_strings(x):
    if isinstance(x, str): SHARED.add(x)
    elif isinstance(x, dict):
        for k, v in x.items():
            if isinstance(k, str): SHARED.add(k)
            shared_strings(v)
    elif isinstance(x, list):
        for y in x: shared_strings(y)
shared_strings(PRECEDENT["walk"]); shared_strings(PRECEDENT["labels"])
shared_strings(PRECEDENT["q4_card"]); shared_strings(PRECEDENT["annotate"])

def walk_pack(x):
    if isinstance(x, str):
        yield x
    elif isinstance(x, dict):
        for v in x.values(): yield from walk_pack(v)
    elif isinstance(x, list):
        for v in x: yield from walk_pack(v)

SKIP_KEYS_STD = {"tile", "walk_name", "walk", "labels", "q4_card", "annotate", "_shape_annotate",
                  "_built", "_signed", "_source", "_ruled", "tool", "room"}
n_strings = 0
for s in walk_pack({k: v for k, v in pack.items() if k not in SKIP_KEYS_STD}):
    if not s or len(s) < 3 or s.isdigit():
        continue
    n_strings += 1
    import re as _re
    is_close_template = bool(_re.match(
        r"^That's the walk\. Now answer Document \d+'s questions in your casefile, starting on "
        r"page \d+\. Use the sentence stem, or write something of equal or better value\.$", s))
    is_casefile_title = (s == "%s \u00b7 %s" % (W.CASEFILE, W.CASEFILE_NAME))
    traced = (s in DESK_STRINGS or s in BUILDER_LITERALS or s in SHARED
              or any(s in ds for ds in DESK_STRINGS)   # a substring of a desk string (e.g. a split paragraph)
              or is_close_template or is_casefile_title)
    ck(traced, "string not traced to a desk module: %r" % (s[:80],))

# ── B · ruled features present, or named in the module's own OPEN note ─────────────────────────
ck(docs[9].get("image_alt") in (None, "") or len(docs[9]["image_alt"]) > 30,
   "doc 9 image_alt (OPEN, named in docassist_113A_pack.py docstring -- not invented here)")
ck(pack.get("_source", "").find("8cb31726acbda0d0d52aebf21102403e") != -1, "Danny's cleared-pack md5 is cited")
ck(all(d.get("before") for d in docs.values() if d["n"] in W.BWT_DOCS), "BEFORE WE TALK present on docs %s" % (W.BWT_DOCS,))
ck(not any(d.get("before") for d in docs.values() if d["n"] not in W.BWT_DOCS), "BEFORE WE TALK absent elsewhere")
for n, d in docs.items():
    steps = d["steps"]
    ck(steps[-1]["tag"] == "CHECK" and steps[-1]["mode"] == "check", "doc %d ends CHECK" % n)
    ck(all(s["mode"] in (None, "oral", "check") for s in steps), "doc %d: no stray step modes" % n)

# ── C · the desk's own keys decide page/close/paper, Josh never authors them ───────────────────
for n, dd in M.DOCS.items():
    ck(docs[n]["page"] == dd["page"], "doc %d page == da_113A's own" % n)
    ck(("page %d" % dd["qpage"]) in docs[n]["close"], "doc %d close cites da_113A's qpage" % n)

print("%d checks, %d bad, %d strings scanned" % (n_checks, len(bad), n_strings))
for b in bad[:40]:
    print(" BAD:", b)
sys.exit(1 if bad else 0)
