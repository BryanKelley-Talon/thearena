#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Check the shipped 10.3 A Doc Assist pack against the desks' own files. Josh, 2026-10-23.

A checker that only asks the questions the builder's author already thought of will pass a
broken pack: the first version of this file ran 365 checks clean while the pack was missing the
Six Umbrellas card entirely, had the NO NAME tip on the wrong step, and carried a label invented
with a string replace. So this version checks three further things:
  A. Every student-visible string in the pack appears in one of the desks' modules. Anything the
     build desk typed itself fails, whether or not it reads correctly.
  B. Every ruled feature the other Global packs carry is present here, or named in _open.
  C. Will's own keys decide placement -- `noname`, not a match on his coaching text.
"""
import os, re, sys, json, importlib.util

HOME = os.environ["HOME"]
COWORK = os.path.join(HOME, "mnt/Cowork")
GLOBAL = os.path.join(COWORK, "global10r-curriculum")
US = os.path.join(COWORK, "us11r-curriculum")
ARENA = os.path.join(COWORK, "flashpoint/Project Flashpoint/builds/thearena")

def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec); sys.modules[name] = mod
    spec.loader.exec_module(mod); return mod

M = load("da_103A",   os.path.join(GLOBAL, "WORK/u103A-docassist/da_103A.py"))
W = load("words_103A", os.path.join(GLOBAL, "skills/u103/words_103A.py"))
G = load("da_global_common", os.path.join(GLOBAL, "skills/doc-assist/da_global_common.py"))
S = load("da_112C",   os.path.join(US, "skills/doc-assist/da_112C.py"))
ORIG = {t[0]: t[3] for t in W.DOCS}
pack = json.load(open(os.path.join(ARENA, "public/content/docassist-gs10r-10.3.json"), encoding="utf-8"))

bad, n_checks = [], 0
def ck(cond, msg):
    global n_checks
    n_checks += 1
    if not cond: bad.append(msg)

docs = {d["n"]: d for d in pack["casefiles"][0]["docs"]}
ck(len(docs) == len(M.DOCS), "document count")
ck(pack["casefiles"][0]["title"] == M.CASEFILE["title"], "casefile title")

# ── A · every student-visible string traces to a desk module ───────────────────────────
DESK_STRINGS = set()
for mod in (G, S, M):
    for nm in dir(mod):
        if nm.startswith("__"): continue
        v = getattr(mod, nm)
        if isinstance(v, str): DESK_STRINGS.add(v)
        elif isinstance(v, (list, tuple)):
            for x in v:
                if isinstance(x, str): DESK_STRINGS.add(x)
                elif isinstance(x, (list, tuple)):
                    DESK_STRINGS.update(y for y in x if isinstance(y, str))
        elif isinstance(v, dict):
            DESK_STRINGS.update(k for k in v if isinstance(k, str))
            DESK_STRINGS.update(x for x in v.values() if isinstance(x, str))
BUILDER_LITERALS = {"(adapted, easier to read)"}   # canon section 6; the other builders' own literal

for key in ("tile", "walk_name"):
    ck(pack[key] in DESK_STRINGS, "pack.%s was typed by the build desk, not imported" % key)
for k, v in pack["labels"].items():
    ck(v in DESK_STRINGS, "labels.%s = %r is not any desk's string" % (k, v))
A = pack["annotate"]
ck(A["model_label"] == G.ANNOTATE_MODEL_LABEL, "annotate.model_label is not G's")
ck(A["model_note"] == G.ANNOTATE_MODEL_NOTE, "annotate.model_note is not G's")
ck(A["oe_where_label"] == M.OI_WHERE_LABEL_103, "annotate.oe_where_label is not Will's 10.3 label")
ck("oe_example_label" not in A or A["oe_example_label"] in DESK_STRINGS,
   "annotate.oe_example_label was invented; the shared one says EVIDENCE, banned from 10.3")
for kind, src in (("text", G.ANNOTATE_TEXT), ("picture", G.ANNOTATE_PICTURE), ("map", G.ANNOTATE_MAP)):
    ck(A["methods"][kind] == [list(x) for x in src], "annotate.methods.%s is not G's, word for word" % kind)
ck("evidence" not in json.dumps(pack).lower() or "Outside Evidence" not in json.dumps(pack),
   "the pack says 'Outside Evidence', banned from 10.3 on (CARRY-FORWARD)")

# ── B · ruled features the other Global packs carry ────────────────────────────────────
U = pack.get("umbrellas")
ck(U is not None, "no Six Umbrellas card, and labels.umbrellas offers the button (RULED BK 2026-10-01 09:05)")
if U:
    ck(U["title"] == G.UMBRELLAS_TITLE and U["intro"] == G.UMBRELLAS_INTRO, "umbrellas title/intro not G's")
    ck(len(U["items"]) == 6, "umbrellas: %d items, must be six" % len(U["items"]))
    ck(list(U["close"]) == list(G.UMBRELLAS_CLOSE), "umbrellas close not G's")
    for it, src in zip(U["items"], G.UMBRELLAS):
        ck((it["n"], it["name"], it["question"], it["issues"]) == src, "umbrella %s not G's" % it.get("n"))
        for d_ in it["issue_defs"]:
            ck(G.ISSUE_DEFS.get(d_["name"]) == d_["definition"], "issue def %r not G's" % d_["name"])
    named = {x["name"] for it in U["items"] for x in it["issue_defs"]}
    ck(named == set(G.ISSUE_DEFS), "the pack defines %d issues; G rules %d" % (len(named), len(G.ISSUE_DEFS)))
ck(isinstance(pack.get("_open"), list) and pack["_open"], "_open must name what is still with the authoring desk")

# ── C · per document ───────────────────────────────────────────────────────────────────
for src in M.DOCS:
    n = src["n"]; out = docs.get(n); w = "doc %s" % n
    if out is None: bad.append("document %s missing" % n); continue
    ck(out["title"] == src["title"], w + ": title")
    ck(out["src"] == src["src"], w + ": source line")
    ck(out["kind"] == src["kind"], w + ": kind")
    ck(out["close"] == M.CLOSE_103.format(n=n, p=out["page"]), w + ": close is not CLOSE_103 with its own page")

    if src.get("atlas"):
        ck(out["text"] == [src["card"]], w + ": the Atlas card is not Will's card")
        ck("steps" not in out and "easier" not in out and "annotate" not in out, w + ": the map carries a walk")
        continue

    orig_lines = ORIG[n].split("\n")
    expect = orig_lines[1:] if orig_lines[0].strip() == src["title"].strip() else orig_lines
    ck(out["text"] == expect, w + ": body is not words_103A's printed text, line for line")
    e = list(src["easier"])
    e_expect = e[1:] if e[0].strip() == src["title"].strip() else e
    ck(out["easier"]["text"] == e_expect, w + ": easier text does not match da_103A")
    ck(out["easier"]["label"] in BUILDER_LITERALS, w + ": easier label is not the builders' literal")

    ck([p["prompt"] for p in out["annotate"]["prompts"]] == list(src["mark"]), w + ": MARK IT UP prompts")
    # every WATCH anchor marks a real place, and every one of Will's anchors is marked
    anchors = [x["where"].replace(", in the source line", "") for x in out["annotate"]["notes"]]
    for a in anchors:
        ck(a in ORIG[n] or a in src["src"], w + ": anchor %r is in neither the text nor the source line" % a[:40])
    declared = " ".join(pack.get("_open", []))
    for raw in src["watch"]:
        head, note = raw[len("Next to "):].split(": ", 1)
        quoted = re.findall("“([^”]+)”", head)
        for q in (quoted or [re.sub(r"\s+in the source line$", "", head).strip()]):
            if q in anchors:
                # indexOf marks the FIRST substring (docassist.jsx l.302), so a repeated anchor
                # marks the wrong words. A marked anchor must be unique.
                hay = ORIG[n] if q in ORIG[n] else src["src"]
                ck(hay.count(q) == 1, w + ": anchor %r occurs %d times; the shell marks the first" % (q[:30], hay.count(q)))
            else:
                # Leaving an anchor unmarked is allowed ONLY where the pack declares it in _open.
                ck(repr(q) in declared,
                   w + ": Will anchors on %r, nothing is marked there, and _open does not say so" % q[:40])
        marked_note = any(x["note"] == note for x in out["annotate"]["notes"])
        ck(marked_note or any(repr(q) in declared for q in (quoted or [head])),
           w + ": a WATCH note's words changed")
    ck(out["annotate"]["oe"]["text"] == " ".join(src["oi"]), w + ": OI line")

    steps = out["steps"]
    ck(len(steps) == len(src["steps"]) + 1, w + ": step count")
    for i, (q_list, line) in enumerate(src["steps"]):
        s_ = steps[i]
        ck(s_["line"] == line, w + " step %d: coaching line changed" % (i + 1))
        if q_list:
            qn, qtext, qmode = q_list[0]
            ck(s_["question"] == qtext, w + " step %d: question text" % (i + 1))
            ck(s_["your_q"] == qn, w + " step %d: your_q" % (i + 1))
            ck(s_["tag"] is None, w + " step %d: carries a category tag" % (i + 1))
            ck(s_["mode"] == ("oral" if qmode == M.OL else None), w + " step %d: mode" % (i + 1))
        else:
            ck(s_["question"] is None and s_["your_q"] is None, w + " step %d: coaching step carries a question" % (i + 1))
    ck(steps[-1]["tag"] == S.LABELS["check"] and steps[-1]["mode"] == "check", w + ": CHECK step")
    ck(steps[-1]["line"] == M.CHECK, w + ": CHECK words")

    # C · Will's `noname` key decides the tip, and it sits under step 1 (RULED BK 10/01 10:26)
    tipped = [i for i, s_ in enumerate(steps) if s_.get("tip")]
    if src.get("noname"):
        ck(tipped == [0], w + ": noname is set; the NO NAME tip must sit on step 1, found %s" % (tipped or "none"))
        if tipped:
            t = steps[0]["tip"]
            ck(t["title"] == G.NO_NAME_TITLE, w + ": tip title not G's")
            ck(t["text"][0] == G.NO_NAME_TEXT, w + ": tip text not G's, word for word")
            want_visual = src["kind"] in {"map", "image", "picture", "chart"}
            ck((G.NO_NAME_VISUAL in t["text"]) == want_visual, w + ": the map/chart line is on the wrong document")
    else:
        ck(not tipped, w + ": carries a NO NAME tip, and Will's noname key is not set")

print("checks run: %d" % n_checks)
if bad:
    print("PROBLEMS: %d" % len(bad))
    for b in bad: print("  -", b)
    sys.exit(1)
print("clean")
