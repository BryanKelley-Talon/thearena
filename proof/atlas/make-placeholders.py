# Placeholder test images for the Atlas proof. Not maps, not history: a grid, labelled boxes
# and abstract shapes, each marked PLACEHOLDER. They live in proof/ and never reach public/.
import math, json, os
from PIL import Image, ImageDraw, ImageFont
W, H = 2400, 1500
OUT = os.path.join(os.path.dirname(__file__), '_proof', 'images')
F = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
font = lambda n: ImageFont.truetype(F, n)

def base(shade=(196, 204, 214)):
    im = Image.new('RGB', (W, H), shade)
    d = ImageDraw.Draw(im)
    for x in range(0, W, 150): d.line([(x, 0), (x, H)], fill=(170, 179, 191), width=2)
    for y in range(0, H, 150): d.line([(0, y), (W, y)], fill=(170, 179, 191), width=2)
    for i, x in enumerate(range(0, W, 150)): d.text((x + 8, 6), chr(65 + i % 26), fill=(110, 118, 130), font=font(30))
    for j, y in enumerate(range(0, H, 150)): d.text((6, y + 8), str(j + 1), fill=(110, 118, 130), font=font(30))
    return im, d

def boxes(d):
    # The four parts a map-reading walk points at. Generic regions, labelled as placeholders.
    for (x, y, w, h, t) in [(90, 80, 760, 190, 'TITLE BLOCK'), (1880, 980, 430, 420, 'KEY'),
                            (90, 1260, 520, 150, 'SCALE'), (2090, 80, 220, 220, 'COMPASS')]:
        d.rectangle([x, y, x + w, y + h], fill=(236, 239, 243), outline=(60, 66, 76), width=6)
        d.text((x + 24, y + 22), t, fill=(40, 44, 52), font=font(52))
        d.text((x + 24, y + h - 60), '(placeholder)', fill=(90, 96, 106), font=font(34))

def stamp(d, text='PLACEHOLDER · NOT A MAP'):
    f = font(120)
    tw = d.textlength(text, font=f)
    d.text(((W - tw) / 2, H / 2 - 70), text, fill=(150, 40, 40), font=f)

def blob(d, cx, cy, r, fill, label):
    pts = [(cx + r * (1 + .18 * math.sin(5 * a)) * math.cos(a), cy + r * (1 + .18 * math.sin(5 * a)) * math.sin(a))
           for a in [i * math.pi / 60 for i in range(120)]]
    d.polygon(pts, fill=fill, outline=(40, 44, 52))
    d.text((cx - 150, cy - 30), label, fill=(20, 20, 20), font=font(52))

def save(im, name, q=78):
    im.save(os.path.join(OUT, name), 'WEBP', quality=q, method=6)

# Base map
im, d = base(); boxes(d); stamp(d); save(im, 'ph-base.webp')
# Then → Now: three steps, a shape that grows. Same size, same grid: registered.
for k, r in enumerate([170, 290, 420]):
    im, d = base(); boxes(d)
    blob(d, 1150, 760, r, (226, 190, 120), f'STEP {k + 1}')
    stamp(d, f'PLACEHOLDER STEP {k + 1}')
    save(im, f'ph-step-{k + 1}.webp')
# Layer A: wavy lines. Layer B: dots. Transparent.
la = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(la)
for off in (420, 620):
    pts = [(x, off + 60 * math.sin(x / 140)) for x in range(0, W, 12)]
    d.line(pts, fill=(40, 110, 200, 255), width=16)
d.text((900, 330), 'PLACEHOLDER LAYER A', fill=(20, 70, 150, 255), font=font(60))
save(la, 'ph-layer-a.webp', 90)
lb = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(lb)
for (x, y) in [(700, 900), (900, 1080), (1300, 980), (1550, 700), (1700, 420), (500, 640)]:
    d.ellipse([x - 34, y - 34, x + 34, y + 34], fill=(150, 60, 160, 255), outline=(30, 20, 40, 255), width=6)
d.text((620, 1150), 'PLACEHOLDER LAYER B', fill=(110, 30, 120, 255), font=font(60))
save(lb, 'ph-layer-b.webp', 90)
# A plain second map for the unit grouping.
im, d = base((206, 210, 200)); stamp(d, 'PLACEHOLDER · MAP 2'); save(im, 'ph-plain.webp')
for n in os.listdir(OUT): print(n, os.path.getsize(os.path.join(OUT, n)) // 1024, 'KB')
