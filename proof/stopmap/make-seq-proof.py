#!/usr/bin/env python3
# PROOF ONLY. Sam's SEQ connection tags (BK 00:04: "We shouldn't veer from seq language...") are a
# proposal until BK says yes. This applies Sam's proposed kinds and explains to a COPY of the live
# Threads file, so BK can see them in the map before Sam rebuilds. The copy lives in proof/ and
# only reaches a proof build. Usage: make-seq-proof.py <path to Sam's threads_v3_seq_links.py>
import ast, json, sys, pathlib
root = pathlib.Path(__file__).resolve().parents[2]
src = pathlib.Path(sys.argv[1]).read_text()
tree = ast.parse(src)
consts = {}
for node in tree.body:
    if isinstance(node, ast.Assign) and isinstance(node.targets[0], ast.Tuple):
        for t, v in zip(node.targets[0].elts, node.value.elts):
            consts[t.id] = ast.literal_eval(v)
SEQ = None
for node in tree.body:
    if isinstance(node, ast.Assign) and getattr(node.targets[0], 'id', None) == 'SEQ':
        SEQ = {}
        for k, v in zip(node.value.keys, node.value.values):
            kind = consts[v.elts[0].id]; text = ast.literal_eval(v.elts[1])
            SEQ[ast.literal_eval(k)] = (kind, text)
d = json.loads((root / 'public/content/threads-us11r.json').read_text())
n = 0
for s in d['stops']:
    for l in s.get('links') or []:
        hit = SEQ.get(f"{s['id']}>{l['to']}")
        if hit:
            l['kind'], l['explain'] = hit; n += 1
d['_proof'] = "PROOF ONLY: Sam's proposed SEQ tags (pending BK). Never ships."
out = pathlib.Path(__file__).resolve().parent / '_proof'
out.mkdir(exist_ok=True)
(out / 'threads-us11r.json').write_text(json.dumps(d, indent=1, ensure_ascii=False))
print(f'{n} links given Sam\'s proposed SEQ kind and explain; {len(SEQ)} in his proposal')
