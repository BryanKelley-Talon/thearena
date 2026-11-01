#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""DOC ASSIST · 10.3 Casefile A → the Arena's JSON. Josh (flashpoint), 2026-10-23.

Josh reshapes fields. Josh does not type words a student reads. Every such string here is
IMPORTED from the desk that rules it:
  * Will's content ............ global10r-curriculum/WORK/u103A-docassist/da_103A.py
  * Will's printed text ....... global10r-curriculum/skills/u103/words_103A.py
  * Global's shared Doc Assist  global10r-curriculum/skills/doc-assist/da_global_common.py
  * Sam's pointer-dialect labels us11r-curriculum/skills/doc-assist/da_112C.py  (CARRY-FORWARD §7)
Page numbers are READ OFF the blessed casefile PDF, never hard-coded.

REBUILT 2026-10-23 after an independent review of the first port. That port hand-typed shared
strings it should have imported, shipped `labels.umbrellas` with no umbrellas card behind it,
ignored Will's own `noname` key in favour of matching his coaching text, and manufactured one
label with a string replace. All four are fixed here. What is still open is listed in OPEN below
and has gone to Will; nothing open is papered over with a guess.

OPEN (Will's, 2026-10-23):
  1. `oe_example_label`. The shared G.OE_EXAMPLE_LABEL reads "OUTSIDE EVIDENCE · AN EXAMPLE".
     "Evidence" is banned from 10.3 on, and Will ruled replacements for the other two shared
     strings (CLOSE_103, OI_WHERE_LABEL_103) but not this one. So the key is OMITTED rather than
     invented. The Arena shows no example label until he rules one.
  2. Document 3 (the map) is the one document NO_NAME_VISUAL was written for, and the one
     document with no walk to hang it on. Left off pending his word.
  3. Document 4's WATCH anchor is 'Next to "our" and "we"'. One `where` cannot carry two words,
     so it is split into two notes with the same note text -- Will's own Doc 9 precedent from
     this morning (1761 / 1762). Flagged to him to overrule.
"""
import os, re, sys, json, importlib.util

HOME = os.environ["HOME"]
COWORK = os.path.join(HOME, "mnt/Cowork")
GLOBAL = os.path.join(COWORK, "global10r-curriculum")
US = os.path.join(COWORK, "us11r-curriculum")
ARENA = os.path.join(COWORK, "flashpoint/Project Flashpoint/builds/thearena")
CASEFILE_PDF = os.path.join(GLOBAL, "OUTPUTS/Unit_10.3/GS10R_10.3A_CASEFILE_v21_2026-10-22.pdf")
OUT_PATH = os.path.join(ARENA, "public/content/docassist-gs10r-10.3.json")

def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod

M = load("da_103A",   os.path.join(GLOBAL, "WORK/u103A-docassist/da_103A.py"))
W = load("words_103A", os.path.join(GLOBAL, "skills/u103/words_103A.py"))
G = load("da_global_common", os.path.join(GLOBAL, "skills/doc-assist/da_global_common.py"))
S = load("da_112C",   os.path.join(US, "skills/doc-assist/da_112C.py"))

ORIG = {t[0]: t[3] for t in W.DOCS}          # "exactly as printed", by document number
VISUAL_KINDS = {"map", "image", "picture", "chart"}

# ── pages: read off the blessed casefile, the way build_global_da_v3 does ──────────────
def casefile_pages():
    import subprocess
    txt = subprocess.run(["pdftotext", "-layout", CASEFILE_PDF, "-"],
                         capture_output=True, text=True, check=True).stdout
    return txt.split("\f")

def page_of_doc(pages, n):
    for i, t in enumerate(pages, 1):
        if re.search(r"DOCUMENT\s+%d\b" % n, t):
            return i
    raise SystemExit("Document %d: no page in %s" % (n, os.path.basename(CASEFILE_PDF)))

# ── WATCH IT DONE ─────────────────────────────────────────────────────────────────────
SRC_SUFFIX = re.compile(r"^(.*)\s+in the source line$")
QUOTED = re.compile("“([^”]+)”")

SKIPPED = []   # anchors the tool cannot mark; reported at the end and listed in _open

def watch_notes(doc, orig_text):
    """Will writes 'Next to X: note'. X may be one quoted phrase, several, or plain words,
    and may name the source line. An anchor naming two places becomes two notes with the same
    words -- Will's Doc 9 precedent (2026-10-23, 1761 / 1762).

    The shell marks an anchor with indexOf: FIRST substring, no word boundary (docassist.jsx
    l.302). So an anchor that is not unique marks the wrong words -- Document 4's "our" lands
    inside "Source:". An anchor that cannot be marked exactly is not marked at all: it is
    skipped, reported, and sent to the desk that owns the words. Marking the wrong text teaches
    a kid the wrong thing, and silently dropping it hides a question only Will can answer."""
    out = []
    for raw in (doc.get("watch") or []):
        assert raw.startswith("Next to "), raw
        anchor_part, note = raw[len("Next to "):].split(": ", 1)
        m = SRC_SUFFIX.match(anchor_part)
        in_src = bool(m)
        core = (m.group(1) if m else anchor_part).strip()
        anchors = QUOTED.findall(core) or [core]
        for a in anchors:
            hay, where = orig_text, a
            if in_src or (a not in orig_text and a in doc["src"]):
                hay, where = doc["src"], "%s, in the source line" % a
            n_hits = hay.count(a)
            if n_hits != 1:
                SKIPPED.append((doc["n"], a, n_hits, note))
                continue
            out.append({"where": where, "mark": "margin", "note": note})
    return out

# ── MARK IT UP ────────────────────────────────────────────────────────────────────────
def mark_for(prompt):
    p = prompt.strip().lower()
    for verb, mark in (("underline", "underline"), ("circle", "circle"),
                       ("box", "box"), ("put a star", "star")):
        if p.startswith(verb):
            return mark
    raise ValueError("unrecognised MARK IT UP verb: %r" % prompt[:40])

# ── the walk ──────────────────────────────────────────────────────────────────────────
def build_steps(doc):
    steps = []
    for q_list, line in doc["steps"]:
        if q_list:
            # Will 2026-10-23 08:35: the pointer is the casefile's question number off the
            # tuple. No category tag to write -- the shell prints labels.your_q % your_q.
            n, text, mode = q_list[0]
            steps.append({"tag": None, "your_q": n,
                          "mode": "oral" if mode == M.OL else None,
                          "question": text, "line": line})
        else:
            steps.append({"tag": None, "your_q": None, "mode": None,
                          "question": None, "line": line})
    # NO NAME ON IT? -- Will's own `noname` key, under STEP 1 (RULED BK 2026-10-01 10:26).
    # The map/chart line rides along on a visual document (G.NO_NAME_DOCS' True/False).
    if doc.get("noname") and steps:
        text = [G.NO_NAME_TEXT]
        if doc.get("kind") in VISUAL_KINDS:
            text.append(G.NO_NAME_VISUAL)
        steps[0]["tip"] = {"title": G.NO_NAME_TITLE, "text": text}
    steps.append({"tag": S.LABELS["check"], "your_q": None, "mode": "check",
                  "question": None, "line": M.CHECK})
    return steps

def drop_title_line(lines, title):
    """da_103A repeats the title as line one on some lists and not others (Document 1 only).
    The Arena prints the title itself, so drop it only where it really is the title."""
    return lines[1:] if lines and lines[0].strip() == title.strip() else lines

def build_doc(doc, pages):
    n = doc["n"]
    page = page_of_doc(pages, n)
    out = {"n": n, "title": doc["title"], "kind": doc["kind"], "src": doc["src"], "page": page}
    if doc.get("atlas"):
        # The map's help lives in the Atlas (Will's NOTES; BK 10/16 12:39). A card, not a walk.
        out["text"] = [doc["card"]]
        out["close"] = M.CLOSE_103.format(n=n, p=page)
        return out
    orig = ORIG[n]
    out["text"] = drop_title_line(orig.split("\n"), doc["title"])
    if doc.get("easier"):
        # The adapted label is the builders' own literal, identical in build_global_da_v3 l.79
        # and Sam's build_da_112A_v2 l.76; canon section 6 requires an adapted version to say so.
        out["easier"] = {"label": "(adapted, easier to read)",
                         "text": drop_title_line(list(doc["easier"]), doc["title"])}
    kind = "map" if doc["kind"] == "map" else ("picture" if doc["kind"] in VISUAL_KINDS else "text")
    ann = {"kind": kind,
           "prompts": [{"mark": mark_for(p), "prompt": p} for p in (doc.get("mark") or [])],
           "notes": watch_notes(doc, orig)}
    if doc.get("oi"):
        ann["oe"] = {"kind": "where", "text": " ".join(doc["oi"])}
    if ann["prompts"] or ann["notes"]:
        out["annotate"] = ann
    out["steps"] = build_steps(doc)
    out["close"] = M.CLOSE_103.format(n=n, p=page)
    return out

def main():
    pages = casefile_pages()
    docs = [build_doc(d, pages) for d in M.DOCS]
    labels = dict(G.LABELS,
                  umbrellas=G.UMBRELLA_BUTTON,
                  annotate=G.ANNOTATE_BUTTON,
                  **{k: S.LABELS[k] for k in ("your_q", "oral", "prompts")})
    annotate = {"button": G.ANNOTATE_BUTTON,
                "methods": {"text": [list(x) for x in G.ANNOTATE_TEXT],
                            "picture": [list(x) for x in G.ANNOTATE_PICTURE],
                            "map": [list(x) for x in G.ANNOTATE_MAP]},
                "model_label": G.ANNOTATE_MODEL_LABEL,
                "model_note": G.ANNOTATE_MODEL_NOTE,
                # oe_example_label: OMITTED. See OPEN 1 -- the shared one says "EVIDENCE".
                "oe_where_label": M.OI_WHERE_LABEL_103}
    umbrellas = {"_ruled": "BK 2026-10-01 09:05 (the button) and 10:28 (the definitions). Words from "
                           "Will's da_global_common, imported, not retyped.",
                 "button": G.UMBRELLA_BUTTON, "title": G.UMBRELLAS_TITLE, "intro": G.UMBRELLAS_INTRO,
                 "items": [{"n": num, "name": nm, "question": q, "issues": iss,
                            "issue_defs": [{"name": x, "definition": G.ISSUE_DEFS[x]}
                                           for x in iss.split(" · ")]}
                           for num, nm, q, iss in G.UMBRELLAS],
                 "close": list(G.UMBRELLAS_CLOSE)}
    pack = {
        "_built": ("Josh (flashpoint) 2026-10-23, via scripts/packs/docassist_103A_pack.py. Content imported "
                   "from Will's da_103A.py (fixed 2026-10-23 09:06) and words_103A.py; every shared string "
                   "imported from da_global_common.py and Sam's da_112C.LABELS. Pages read off "
                   "GS10R_10.3A_CASEFILE_v21_2026-10-22.pdf. Danny's clearance 2026-10-22: 12/12/0."),
        "_ruled": "CARRY-FORWARD §7 (the tagged walk); Will 2026-10-23 08:35 (shape) and 09:06 (anchors).",
        "_shape": ("Documents 1-2 and 4-10 carry their own tagged steps, so the shell reads each document's own "
                   "length. Document 3 is the Atlas card: no steps, so no walk runs on it."),
        "_open": ["oe_example_label omitted: the shared label says OUTSIDE EVIDENCE, banned from 10.3 (Will).",
                  "Document 3 carries no NO NAME ON IT? tip: it has no step 1 to hang it on (Will).",
                  "Document 4's WATCH anchor names two pronouns, each of which occurs three times. "
                  "The shell marks the first substring, so neither can be marked without marking the "
                  "wrong words. The note is not marked at all; the anchor is Will's to re-cut."],
        "tool": G.TOOL, "room": "10.3", "course": "GS10R",
        "tile": G.TILE, "walk_name": G.WALK_NAME,
        "labels": labels, "annotate": annotate, "umbrellas": umbrellas,
        "casefiles": [{"id": "A", "title": M.CASEFILE["title"], "status": "open", "docs": docs}],
    }
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(pack, f, ensure_ascii=False, indent=1)
        f.write("\n")
    if SKIPPED:
        pack["_open"] += ["Document %d: WATCH anchor %r appears %d times, so the tool would mark the "
                          "wrong words. Not marked; with Will." % (n, a, c) for n, a, c, _ in SKIPPED]
        with open(OUT_PATH, "w", encoding="utf-8") as f:
            json.dump(pack, f, ensure_ascii=False, indent=1); f.write("\n")
    print("wrote", OUT_PATH)
    for n, a, c, note in SKIPPED:
        print("  SKIPPED  doc %d  anchor %r occurs %d time(s) -- note not marked: %s" % (n, a, c, note[:60]))
    for d in docs:
        tip = [s for s in d.get("steps", []) if s.get("tip")]
        print("  doc %-3s kind=%-5s page=%-3s steps=%-3s watch=%-3s tip=%s" % (
            d["n"], d["kind"], d["page"], len(d.get("steps", [])),
            len(d.get("annotate", {}).get("notes", [])),
            "step %d" % (d["steps"].index(tip[0]) + 1) if tip else "-"))

if __name__ == "__main__":
    main()
