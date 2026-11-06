"""Top view of the Messy Hands Inbox scene in real centimetres.

Every number comes from devpost/build-notes.md (scene graph, Round 1 and Round 2
measurements). Run:  python3 devpost/make_layout_diagram.py
"""
import math
from PIL import Image, ImageDraw, ImageFont

W, H = 1800, 1200
BG = (22, 24, 30); FG = (240, 242, 248); MUTED = (150, 156, 172); MINT = (120, 240, 160)
WOOD = (150, 110, 70); DOUGH = (236, 222, 190); CARD = (90, 84, 78); FOV = (120, 170, 255)
F = '/System/Library/Fonts/Avenir Next.ttc'
def font(s, b=False): return ImageFont.truetype(F, s, index=2 if b else 0)

im = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(im, 'RGBA')
S = 7.2                      # px per cm
EX, EY = 760, 1040           # the user's eyes (origin), looking "up" the image = -Z
def P(x, z):                 # scene cm (x right, z forward = -Z) -> px
    return EX + x * S, EY - z * S

d.text((60, 40), 'WHERE THINGS SIT  ·  TOP VIEW, REAL CENTIMETRES', font=font(30, True), fill=MINT)
d.text((60, 84), 'Planned in the plan-lens brief, built by CLAD, measured by the LEAF tests', font=font(40, True), fill=FG)

# field of view of the display, looking straight at the dough (32.3 deg wide)
half = math.radians(32.3 / 2); L = 115
for sgn in (-1, 1):
    x, z = math.tan(half) * L * sgn, L
    d.line([P(0, 0), P(x, z)], fill=FOV + (170,), width=3)
d.polygon([P(0, 0), P(-math.tan(half) * L, L), P(math.tan(half) * L, L)], fill=FOV + (28,))
d.text(P(-math.tan(half) * L - 4, L + 9), 'display 32.3° wide', font=font(26), fill=FOV)

# counter 120 x 60, centred under the dough at 55 cm
d.rectangle([P(-60, 85), P(60, 25)], fill=WOOD + (235,), outline=(190, 150, 100), width=3)
d.text(P(-58, 84), 'counter 120 x 60 cm, top at 90 cm', font=font(26), fill=(40, 28, 18))

# dough: 20 cm, centre 55 cm in front
cx, cz = P(0, 55); r = 10 * S
d.ellipse([cx - r, cz - r, cx + r, cz + r], fill=DOUGH, outline=(255, 248, 230), width=3)
d.text((cx - 70, cz - 18), 'dough 20 cm', font=font(28, True), fill=(60, 50, 40))

# card: 22 cm wide, centre 26 cm right of the dough, lying on the counter
kx, kz = P(26, 55); kw, kd = 11 * S, 8 * S
d.rounded_rectangle([kx - kw, kz - kd, kx + kw, kz + kd], 14, fill=CARD, outline=(200, 195, 185), width=3)
d.ellipse([kx - kw + 14, kz - kd + 14, kx - kw + 34, kz - kd + 34], fill=MINT)
d.text((kx - kw + 42, kz - kd + 10), '22 cm', font=font(26, True), fill=FG)
d.text((kx + kw + 14, kz - kd), 'card, tilted', font=font(26, True), fill=FG)
d.text((kx + kw + 14, kz - kd + 34), 'up to the eye', font=font(26, True), fill=FG)

# dimension: 26 cm between centres
y = P(0, 55)[1] + 10 * S + 34
d.line([(cx, y), (kx, y)], fill=FG, width=2)
for xx in (cx, kx): d.line([(xx, y - 10), (xx, y + 10)], fill=FG, width=2)
d.text(((cx + kx) / 2 - 36, y + 6), '26 cm', font=font(28, True), fill=FG)

# dimension: 55 cm from the eye to the dough
d.line([P(-75, 0), P(-75, 55)], fill=MUTED, width=2)
for z in (0, 55): d.line([P(-78, z), P(-72, z)], fill=MUTED, width=2)
d.text(P(-74, 30), ' 55 cm', font=font(28, True), fill=MUTED)

# eye
d.ellipse([EX - 16, EY - 16, EX + 16, EY + 16], fill=FG)
d.text((EX - 80, EY + 24), 'your eyes, ~160 cm up', font=font(26), fill=MUTED)

# measured facts panel
px = 1270
d.text((px, 300), 'MEASURED BY THE TESTS', font=font(26, True), fill=MINT)
facts = [
    ('83.4 cm', 'eye to card'),
    ('24.8° + 28.0°', 'dough + card, more than 32.3°:'),
    ('', 'you glance, the card never covers'),
    ('', 'the dough (1.8° gap)'),
    ('9.4 x 4.4 cm', 'smallest target, floor 4 cm'),
    ('1.29 cm', 'smallest letter on the card'),
    ('53.3 cm', 'furthest row from a seated'),
    ('', 'shoulder, arm 62 cm'),
]
yy = 350
for big, small in facts:
    if big:
        d.text((px, yy), big, font=font(38, True), fill=FG); yy += 50
    d.text((px, yy), small, font=font(26), fill=MUTED); yy += 38
d.text((60, H - 60), 'Source: devpost/build-notes.md (scene graph, Round 1, Round 2). Lens Studio preview, not measured on a device.',
       font=font(24), fill=MUTED)
im.save('devpost/layout_top_view.png')
print('saved', im.size)
