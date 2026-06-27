#!/usr/bin/env python3
"""
Pixel-art sprite generator for THE OBSERVATION WING.

Recreates the six analog-horror entities as chunky pixel-art "camera stills".
Each entity is drawn on a small low-res grid and upscaled with NEAREST
sampling so the exported PNG reads as crisp pixel art, then dosed with grain
to sell the surveillance / VHS aesthetic.

Run:  python3 tools/generate_sprites.py
Out:  assets/monsters/*.png   (640x480 each)
"""

import os
import random
import math
from PIL import Image, ImageDraw

random.seed(1850)

W, H = 128, 96          # low-res working grid
SCALE = 5               # upscale factor -> 640 x 480
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "monsters")
os.makedirs(OUT, exist_ok=True)


# ---------------------------------------------------------------- helpers
def new_canvas(bg):
    img = Image.new("RGB", (W, H), bg)
    return img, ImageDraw.Draw(img)


def grain(img, amount=14, mono=True):
    """Add per-pixel analog grain."""
    px = img.load()
    for y in range(H):
        for x in range(W):
            r, g, b = px[x, y]
            if mono:
                n = random.randint(-amount, amount)
                px[x, y] = (clamp(r + n), clamp(g + n), clamp(b + n))
            else:
                px[x, y] = (clamp(r + random.randint(-amount, amount)),
                            clamp(g + random.randint(-amount, amount)),
                            clamp(b + random.randint(-amount, amount)))
    return img


def vignette(img, strength=0.55):
    px = img.load()
    cx, cy = W / 2, H / 2
    maxd = math.hypot(cx, cy)
    for y in range(H):
        for x in range(W):
            d = math.hypot(x - cx, y - cy) / maxd
            f = 1.0 - strength * (d ** 2)
            r, g, b = px[x, y]
            px[x, y] = (clamp(int(r * f)), clamp(int(g * f)), clamp(int(b * f)))
    return img


def clamp(v):
    return 0 if v < 0 else 255 if v > 255 else v


def save(img, name):
    big = img.resize((W * SCALE, H * SCALE), Image.NEAREST)
    big.save(os.path.join(OUT, name))
    print("wrote", name)


# ---------------------------------------------------------------- 1. Doctor Insane
def doctor_insane():
    img, d = new_canvas((196, 150, 142))            # warm pink wall
    # corner wall: lighter panel on the left
    d.rectangle([0, 0, 54, H], fill=(206, 162, 152))
    d.line([(54, 0), (54, 70)], fill=(150, 110, 105), width=1)
    # dark patterned carpet
    d.rectangle([0, 70, W, H], fill=(58, 50, 54))
    for x in range(0, W, 8):
        for y in range(72, H, 6):
            d.point((x + (y % 2), y), fill=(78, 68, 72))
    # chair (lower left)
    d.rectangle([6, 56, 30, 92], fill=(34, 30, 34))
    d.rectangle([6, 40, 12, 70], fill=(40, 36, 40))
    # figure -- black silhouette, cone head, spindly limbs
    body = (12, 10, 14)
    # cone / dunce head
    d.polygon([(60, 6), (74, 44), (52, 44)], fill=body)
    # two pale eye holes on the cone
    d.ellipse([59, 30, 62, 35], fill=(212, 200, 196))
    d.ellipse([65, 30, 68, 35], fill=(212, 200, 196))
    # neck + hunched torso leaning forward
    d.line([(62, 44), (54, 58)], fill=body, width=4)
    d.polygon([(40, 56), (62, 50), (60, 70), (44, 70)], fill=body)
    # long thin arms draping forward
    d.line([(46, 58), (30, 78), (40, 88)], fill=body, width=3, joint="curve")
    d.line([(58, 58), (44, 80)], fill=body, width=3, joint="curve")
    # extremely long splayed legs to the right
    d.line([(54, 66), (96, 84), (118, 92)], fill=body, width=4, joint="curve")
    d.line([(50, 68), (78, 90)], fill=body, width=4, joint="curve")
    d.line([(96, 84), (104, 80)], fill=body, width=3)     # foot
    img = vignette(img, 0.45)
    img = grain(img, 10)
    save(img, "doctor_insane.png")


# ---------------------------------------------------------------- 2. The Glass Man
def glass_man():
    img, d = new_canvas((150, 122, 78))             # gold wallpaper base
    # damask wallpaper motif
    for ty in range(0, H, 16):
        for tx in range(0, W, 16):
            d.ellipse([tx + 4, ty + 3, tx + 11, ty + 12], outline=(120, 96, 58))
            d.point((tx + 8, ty + 1), fill=(176, 146, 96))
            d.point((tx + 8, ty + 14), fill=(176, 146, 96))
            d.line([(tx, ty + 8), (tx + 4, ty + 8)], fill=(120, 96, 58))
    # left wall panel slightly darker (corner)
    d.rectangle([0, 0, 40, H], fill=(120, 96, 60))
    dark = (16, 12, 12)
    # tangled hair-like shadows
    for i in range(14):
        x0 = 30 + random.randint(-6, 10)
        d.line([(x0, 12), (x0 + random.randint(-8, 8), 30 + random.randint(0, 20))],
               fill=dark, width=2, joint="curve")
    # pale mask face
    d.ellipse([26, 18, 46, 44], fill=(214, 206, 196))
    d.ellipse([30, 26, 34, 31], fill=(20, 18, 18))      # eyes
    d.ellipse([38, 26, 42, 31], fill=(20, 18, 18))
    d.line([(35, 31), (36, 38)], fill=(150, 140, 132), width=1)   # nose
    d.ellipse([33, 39, 41, 43], fill=(40, 30, 30))      # open mouth
    # long distorted dark body / limbs
    d.polygon([(28, 44), (46, 44), (42, 88), (30, 88)], fill=dark)
    d.line([(30, 50), (16, 74), (22, 92)], fill=dark, width=3, joint="curve")
    d.line([(44, 50), (40, 78), (34, 94)], fill=dark, width=3, joint="curve")
    # hand pressed toward the camera (right)
    hand = (28, 22, 22)
    d.rectangle([86, 50, 104, 72], fill=hand)           # palm
    for fx in range(86, 106, 5):                        # fingers
        d.rectangle([fx, 30, fx + 3, 52], fill=hand)
    d.rectangle([78, 54, 88, 66], fill=hand)            # thumb
    # cracked-glass star on the palm
    cx, cy = 95, 61
    for ang in range(0, 360, 30):
        r = 7 + random.randint(-2, 2)
        x2 = cx + int(r * math.cos(math.radians(ang)))
        y2 = cy + int(r * math.sin(math.radians(ang)))
        d.line([(cx, cy), (x2, y2)], fill=(220, 224, 230), width=1)
    img = vignette(img, 0.5)
    img = grain(img, 9)
    save(img, "glass_man.png")


# ---------------------------------------------------------------- 3. Sad Guy
def sad_guy():
    img, d = new_canvas((96, 96, 100))              # gray tiled wall
    # tile grid
    for x in range(0, W, 10):
        d.line([(x, 0), (x, 78)], fill=(70, 70, 74))
    for y in range(0, 80, 10):
        d.line([(0, y), (W, y)], fill=(70, 70, 74))
    # darker floor + tub/drain
    d.rectangle([0, 78, W, H], fill=(48, 46, 50))
    d.rectangle([70, 80, 120, 92], fill=(34, 32, 36))   # tub
    d.ellipse([90, 84, 98, 90], fill=(20, 18, 22))      # drain
    # shower head + pipe on the right
    d.line([(110, 8), (110, 30)], fill=(60, 60, 64), width=2)
    d.rectangle([104, 30, 116, 36], fill=(70, 70, 74))
    # small dark chair / stool lower-left
    d.rectangle([8, 70, 20, 86], fill=(40, 38, 42))
    # pale skeletal figure, centered, very tall
    pale = (224, 222, 216)
    sh = (150, 150, 148)
    # head
    d.ellipse([57, 6, 69, 22], fill=pale)
    d.ellipse([60, 12, 62, 15], fill=(40, 40, 44))      # eyes
    d.ellipse([64, 12, 66, 15], fill=(40, 40, 44))
    # long neck
    d.rectangle([61, 22, 65, 34], fill=pale)
    # torso with ribs
    d.rectangle([54, 34, 72, 60], fill=pale)
    for ry in range(37, 58, 4):
        d.line([(56, ry), (70, ry)], fill=sh, width=1)
    d.line([(63, 35), (63, 59)], fill=sh, width=1)      # sternum
    # very long arms
    d.line([(55, 36), (48, 70)], fill=pale, width=3)
    d.line([(71, 36), (78, 70)], fill=pale, width=3)
    # very long legs
    d.line([(60, 60), (56, 92)], fill=pale, width=3)
    d.line([(66, 60), (70, 92)], fill=pale, width=3)
    img = vignette(img, 0.6)
    img = grain(img, 11)
    save(img, "sad_guy.png")


# ---------------------------------------------------------------- 4. Guilt
def guilt():
    img, d = new_canvas((120, 120, 120))            # grainy gray field
    # faint ground texture corners
    for _ in range(400):
        x, y = random.randint(0, W - 1), random.randint(0, H - 1)
        v = random.randint(96, 150)
        d.point((x, y), fill=(v, v, v))
    dark = (8, 8, 10)
    # wide flat "anvil" head tapering to a body, filled silhouette
    d.polygon([(8, 26), (120, 26), (84, 50), (44, 50)], fill=dark)   # brim/head
    d.polygon([(44, 48), (84, 48), (90, 96), (38, 96)], fill=dark)   # body
    # two white crescent eyes
    d.arc([56, 30, 64, 42], 250, 110, fill=(235, 235, 235), width=2)
    d.arc([66, 30, 74, 42], 70, 290, fill=(235, 235, 235), width=2)
    img = vignette(img, 0.35)
    img = grain(img, 22)                            # heavy static
    save(img, "guilt.png")


# ---------------------------------------------------------------- 5. The Listener
def listener():
    img, d = new_canvas((10, 10, 12))               # near-black
    # a dark grainy face emerging from the black
    face = (40, 40, 44)
    d.ellipse([42, 18, 86, 84], fill=face)
    # faint brow shading
    d.ellipse([46, 22, 82, 58], fill=(52, 52, 56))
    # two large round eyes
    for ex in (56, 72):
        d.ellipse([ex - 7, 40, ex + 7, 56], fill=(150, 150, 150))
        d.ellipse([ex - 4, 43, ex + 4, 53], fill=(12, 12, 14))
    # wide open mouth
    d.ellipse([54, 62, 74, 78], fill=(8, 8, 10))
    d.arc([54, 58, 74, 80], 20, 160, fill=(90, 90, 92), width=1)
    img = vignette(img, 0.55)
    img = grain(img, 18)
    save(img, "listener.png")


# ---------------------------------------------------------------- 6. The Locust
def locust():
    img, d = new_canvas((34, 40, 34))               # sickly dim green-gray
    cx, cy = 64, 48
    # faint lighter haze marking where the swarm thickens into a humanoid mass
    for _ in range(1300):
        a = random.random() * 2 * math.pi
        rad = random.random() ** 0.7
        x = int(cx + 24 * rad * math.cos(a))
        y = int(cy + 38 * rad * math.sin(a))
        if 0 <= x < W and 0 <= y < H:
            v = 54 + int(26 * (1 - rad))
            d.point((x, y), fill=(v, v + 8, v))
    # dense dark insect specks clustering into the silhouette
    for _ in range(2200):
        a = random.random() * 2 * math.pi
        rad = random.random() ** 0.5
        x = int(cx + 22 * rad * math.cos(a))
        y = int(cy + 36 * rad * math.sin(a))
        if 0 <= x < W and 0 <= y < H:
            d.point((x, y), fill=(7, 10, 7))
    # a few larger crawling insect-shadow shapes with light glints
    for _ in range(60):
        x = random.randint(36, 92)
        y = random.randint(10, 90)
        s = random.randint(1, 2)
        d.ellipse([x, y, x + s + 1, y + s], fill=(4, 6, 4))
        d.point((x, y - 1), fill=(96, 104, 96))         # glint
    img = vignette(img, 0.45)
    img = grain(img, 14, mono=False)
    save(img, "locust.png")


if __name__ == "__main__":
    doctor_insane()
    glass_man()
    sad_guy()
    guilt()
    listener()
    locust()
    print("done.")
