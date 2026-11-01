# -*- coding: utf-8 -*-
"""DOC ASSIST · 11.3A Casefile A -> the Arena's JSON. Josh (flashpoint), 2026-10-31.

Josh reshapes fields. Josh does not type words a student reads. Every student-visible string here
is IMPORTED from the desk that rules it:
  * Sam's coaching (walk steps, prompts, notes, oe pointers, easier text) .. In/da_113A.py
  * Sam's printed words (titles, source lines, document text, questions,
    OI callouts, the OI rule line) ........................................ skills/u113/words_113A.py
  * The standing US course infrastructure (the 5-step shared walk, button
    labels, the Civic Principles card, the annotation methods) -- these
    never change per unit, so they are copied from the already-live
    docassist-us11r-11.2.json, not retyped.
Pages are da_113A.py's own (v18, 2026-10-24, checked against the PDF) -- nothing re-derived here.

Cleared: Danny 2026-10-30 14:24 (113 claims, 1 fix already applied, 0 unsupported, source
US11R_11.3A_DocAssist_WORDING_SIGNED_2026-10-30.pdf md5 8cb31726acbda0d0d52aebf21102403e) and
2026-10-31 08:48 (the pack file itself, unchanged since the 14:24 clearance -- no fresh round).

OPEN, not guessed:
  1. Document 9 (the Texas boundary map) has no image_alt anywhere on Sam's or Will's desks. The
     gate hard-fails a live image with no alt (gate-content.mjs:421), so this pack ships with
     doc_assist.published false (held dark, same mechanism as the 11.3A Atlas) until Sam sends one.
     Nothing else in this pack is incomplete.
"""
import os, sys, json, importlib.util, shutil

HOME = os.environ["HOME"]
COWORK = os.path.join(HOME, "mnt/Cowork")
US = os.path.join(COWORK, "us11r-curriculum")
FP = os.path.join(COWORK, "flashpoint/Project Flashpoint")
ARENA = os.path.join(FP, "builds/thearena")
OUT_PATH = os.path.join(ARENA, "public/content/docassist-us11r-11.3A.json")
PRECEDENT_PATH = os.path.join(ARENA, "public/content/docassist-us11r-11.2.json")

def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod

# da_113A.py's own sys.path trick expects a sibling "../u113" dir holding words_113A.py; point it at
# the real one on Sam's desk instead of trying to fake a folder layout.
sys.path.insert(0, os.path.join(US, "skills/u113"))
M = load("da_113A", os.path.join(FP, "In/da_113A.py"))   # pulls in words_113A itself via its own import
W = sys.modules["words_113A"]

PRECEDENT = json.load(open(PRECEDENT_PATH, encoding="utf-8"))

QBY = {q[0]: q for q in W.QUESTIONS}   # q number -> (q, doc, frame, question_text, stem, golden, lines)

def close_line(n, qpage):
    return ("That's the walk. Now answer Document %d's questions in your casefile, starting on "
            "page %d. Use the sentence stem, or write something of equal or better value." % (n, qpage))

def build_steps(n, steps):
    # A plain-label step (SOURCING, READ IT THROUGH, CHECK, BEFORE WE TALK -- no "Q#" in its own tag)
    # can still carry a your_q: that is a forward-pointing chip only ("-> your Q4"), not the question
    # itself, which prints once, at the step whose own tag IS that question's frame (confirmed: every
    # plain-tag step's your_q matches a LATER step in the same document carrying that exact frame).
    # Document 9 is the one swap the casefile makes (words_113A ATLAS_DOC/ATLAS_QN): its two
    # "Q1 . GEOGRAPHIC CONTEXT" steps both point at W.ATLAS_Q, which replaces QUESTIONS 19 and 20.
    out = []
    for tag, your_q, mode, line in steps:
        question = None
        if your_q:
            if n == W.ATLAS_DOC and tag == W.ATLAS_Q[0]:
                question = W.ATLAS_Q[1]
            elif QBY[your_q][2] == tag:
                question = QBY[your_q][3]
            # else: a forward-pointing chip on a plain-label step; no question text at this step.
        out.append({"tag": tag, "your_q": your_q, "mode": mode, "question": question, "line": line})
    return out

def wdoc(n):
    for t in W.DOCS:
        if t[0] == n:
            return t
    raise SystemExit("Document %d not in words_113A.DOCS" % n)

def build_doc(n, dd):
    wn, kind, context, src, body, record = wdoc(n)
    assert wn == n
    # BEFORE WE TALK: the gate's step.mode is only null/"oral"/"check" -- a "before" step is not a
    # walk step at all, it is the document's own doc.before framing line (casefile_kit's standing
    # box), shown ahead of the walk. Pull it out of steps, in whichever position Sam put it.
    raw_steps = list(dd["steps"])
    before = None
    kept = []
    for tag, your_q, mode, line in raw_steps:
        if mode == "before":
            before = {"title": "BEFORE WE TALK", "text": line}
        else:
            kept.append((tag, your_q, mode, line))

    doc = {
        "n": n,
        "title": dd["title"],
        "kind": kind,
        "src": src,
        "page": dd["page"],
        "steps": build_steps(n, kept),
        "close": close_line(n, dd["qpage"]),
        "annotate": {
            "kind": kind if kind != "image" else "map",   # Doc 9 is the Texas boundary map
            "notes": [{"where": w, "mark": mark, "note": note} for (w, mark, note) in dd.get("notes", [])],
            "prompts": [{"mark": mark, "prompt": p} for (mark, p) in dd.get("prompts", [])],
            "oe": {"kind": dd["oe"][0], "text": dd["oe"][1]},
        },
    }
    if before:
        doc["before"] = before
    if context:
        doc["context"] = context
    if kind == "text":
        doc["text"] = body.split("\n")
        easier = dd.get("easier") or []
        if easier:
            doc["easier"] = {"label": "(adapted, easier to read)", "text": easier}
    else:
        doc["image_file"] = body   # the STIMULUS_BANK path, as words_113A prints it
        # image_alt / describe: NOT SUPPLIED anywhere on the desks. Left unset on purpose -- see
        # module docstring OPEN #1. Filled in the moment Sam sends one; nothing else here changes.
        doc["licence"] = {"text": "As printed on the NYSED Regents exam in US History and Government, January 2024.",
                           "sellable": False}
    return doc

casefile_a = {
    "id": "A",
    "title": "%s · %s" % (W.CASEFILE, W.CASEFILE_NAME),
    "status": "open",
    "docs": [build_doc(n, M.DOCS[n]) for n in sorted(M.DOCS)],
}

out = {
    "_built": "Josh (flashpoint) 2026-10-31, ported from Sam's In/da_113A.py and "
              "us11r-curriculum/skills/u113/words_113A.py.",
    "_signed": "Danny (copy-desk) 2026-10-30 14:24 EDT (113 claims, 1 fix applied, 0 unsupported) "
               "and 2026-10-31 08:48 EDT (pack file itself, unchanged since the 14:24 clearance).",
    "_source": "US11R_11.3A_DocAssist_WORDING_SIGNED_2026-10-30.pdf, md5 8cb31726acbda0d0d52aebf21102403e.",
    "_ruled": "CARRY-FORWARD §6 DOC ASSIST (BK 2026-10-01 08:16); shape unchanged since 11.2 (BK "
              "2026-10-08 21:37 N5; BK 10/1 09:25 the four-question walk).",
    "tool": "Doc Assist",
    "room": "11.3A",
    "tile": PRECEDENT["tile"],
    "walk_name": PRECEDENT["walk_name"],
    "walk": PRECEDENT["walk"],          # the standing 5-step shared walk, course infrastructure, unchanged
    "labels": PRECEDENT["labels"],      # the standing button words, unchanged
    "casefiles": [casefile_a],
    "q4_card": PRECEDENT["q4_card"],    # the standing Civic Principles card, unchanged all year
    "annotate": PRECEDENT["annotate"],  # the standing annotation-methods text, unchanged
    "_shape_annotate": PRECEDENT["_shape_annotate"],
}

json.dump(out, open(OUT_PATH, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
open(OUT_PATH, "a", encoding="utf-8").write("\n")
print("wrote", OUT_PATH)

# ---- the image asset: copy Doc 9's crop in alongside the other units' (flat in public/content), ----
# ---- the convention 11.1/11.2 already use (image_file keeps its logical STIMULUS_BANK path). -------
SRC_IMG = os.path.join(US, "STIMULUS_BANK/Unit_03/unit03-0124-mc07.png")
DST_IMG = os.path.join(ARENA, "public/content/unit03-0124-mc07.png")
if os.path.exists(SRC_IMG):
    shutil.copy2(SRC_IMG, DST_IMG)
    print("copied", SRC_IMG, "->", DST_IMG)
else:
    print("MISSING image source:", SRC_IMG)
