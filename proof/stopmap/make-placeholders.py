#!/usr/bin/env python3
# PROOF ONLY. Copies the live stop files and fills the redesign's new fields with marked
# placeholders, so BK can judge the mechanic before the desks' words land. These files live
# outside public/ and only reach a proof build (proof/atlas/build-proof.sh copies _proof/).
import json, re, sys, pathlib
root = pathlib.Path(__file__).resolve().parents[2]
out = pathlib.Path(__file__).resolve().parent / '_proof'
DESK = {'threads-us11r.json': 'Sam', 'enduring-issues-gs10r.json': 'Will'}
for name, desk in DESK.items():
    d = json.loads((root / 'public/content' / name).read_text())
    for i, s in enumerate(d['stops']):
        if s.get('status') != 'open':
            continue
        s.setdefault('exemplar', {
            'context': f"[PLACEHOLDER, {desk} writes] One or two sentences on what was going on around {s['when']}.",
            'claim': f"[PLACEHOLDER] One sentence: what “{s['title']}” shows on this line.",
            'evidence': "[PLACEHOLDER] One or two sentences from this stop's own document, quoted or closely paraphrased.",
            'explain': "[PLACEHOLDER] How the evidence proves the claim, and the link back to the big question.",
        })
        m = re.match(r'(\d+\.\d+) Casefile ([A-Z]), Document (\d+[a-z]?)', (s.get('document') or {}).get('source_ref') or '')
        if m and not s.get('doc_assist'):
            s['doc_assist'] = f"{m.group(1)}/{m.group(2)}/{m.group(3)}"
        for j, l in enumerate(s.get('links') or []):
            l.setdefault('kind', 'change' if (i + j) % 2 == 0 else 'continuity')
            l.setdefault('explain', f"[PLACEHOLDER, {desk} writes] Two or three sentences: what changed (or stayed the same) between these two stops, and why it matters.")
    # One cross-issue link for the Global proof (the live file has none yet), so BK can see
    # the fade work across two issues. Marked; never ships.
    if name.startswith('enduring'):
        a = next(x for x in d['stops'] if x['id'] == 's-1658-aurangzeb')
        a.setdefault('links', []).append({'to': 's-1683-ottoman', 'why': '[PLACEHOLDER LINK, proof only]', 'kind': 'continuity',
            'explain': '[PLACEHOLDER, Will writes] Two or three sentences: what stayed the same between these two stops, and why it matters.'})
    d['_proof'] = 'PLACEHOLDERS. Proof build only. Never ships.'
    (out / name).write_text(json.dumps(d, indent=1, ensure_ascii=False))
    print(name, 'placeholders written')
