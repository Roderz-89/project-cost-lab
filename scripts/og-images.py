#!/usr/bin/env python3
"""Project Cost Lab — Open Graph share images (1200x630 PNG) in /og/.
Usage: python3 scripts/og-images.py   (needs Pillow, rsvg-convert and the Inter font; run after build-costs.mjs)
Writes og/default.png plus og/<slug>.png for every page listed in content/costs.json."""
import json, subprocess, os
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
NAVY, TEAL, WHITE, MUTED = (6, 46, 98), (0, 150, 161), (255, 255, 255), (195, 209, 229)
FD = "/usr/share/fonts/opentype/inter/"
def font(name, size): return ImageFont.truetype(FD + name, size)

def mark(size):
    svg = open(os.path.join(ROOT, "brand/pcl-mark-reverse.svg")).read()
    png = subprocess.run(["rsvg-convert", "-w", str(size), "-h", str(size)], input=svg.encode(), capture_output=True, check=True).stdout
    from io import BytesIO
    return Image.open(BytesIO(png)).convert("RGBA")

def wrap(d, text, f, width):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if d.textlength(t, font=f) <= width: cur = t
        else: lines.append(cur); cur = w
    lines.append(cur); return lines

def make(path, title, sub):
    im = Image.new("RGB", (1200, 630), NAVY); d = ImageDraw.Draw(im, "RGBA")
    # faint blueprint grid
    for x in range(0, 1200, 40): d.line([(x, 0), (x, 630)], fill=(255, 255, 255, 10))
    for y in range(0, 630, 40): d.line([(0, y), (1200, y)], fill=(255, 255, 255, 10))
    # low / mid / high range bars, bottom right
    for i, (h, c) in enumerate([(120, (255, 255, 255, 38)), (220, TEAL + (255,)), (170, (255, 255, 255, 38))]):
        x = 930 + i * 70; d.rounded_rectangle([x, 520 - h, x + 50, 520], radius=8, fill=c)
    d.rectangle([0, 606, 1200, 630], fill=TEAL)
    m = mark(84); im.paste(m, (72, 64), m)
    fb = font("InterDisplay-Bold.otf", 42)
    d.text((176, 84), "Project Cost", font=fb, fill=WHITE)
    w = d.textlength("Project Cost ", font=fb)
    d.text((176 + w, 84), "Lab", font=fb, fill=(20, 179, 190))
    ft = font("InterDisplay-Bold.otf", 66); y = 222
    for line in wrap(d, title, ft, 820)[:3]:
        d.text((72, y), line, font=ft, fill=WHITE); y += 80
    d.text((72, y + 18), sub, font=font("Inter-SemiBold.otf", 30), fill=MUTED)
    d.text((72, 540), "Illustrative UK ranges \u00b7 not a quote \u00b7 Rodway Labs", font=font("Inter-SemiBold.otf", 24), fill=MUTED)
    im.save(path, optimize=True)

os.makedirs(os.path.join(ROOT, "og"), exist_ok=True)
make(os.path.join(ROOT, "og/default.png"), "UK home project cost ranges for 2026", "57 projects · size, spec, region and VAT")
for p in json.load(open(os.path.join(ROOT, "content/costs.json")))["pages"]:
    make(os.path.join(ROOT, f"og/{p['slug']}.png"), p["ogTitle"], p["ogSub"])
print("OG images written to og/")
