#!/usr/bin/env python3
"""
Generate the Open Graph share image for the 4 LIFE portfolio.

Output : assets/images/og-cover.jpg  (1200x630, JPEG q90, < 300 KB)
Palette: background #070709, accent red #e51e2b, text #f7f4ea
Content: brand mark "4 LIFE" (with red heart), "Alif Adwitiya Pratama",
         "Collection Systems · Data & Applied AI", and the tagline
         "Built 4 Life — From real life needs to real life solutions."

Reproducible: run `python lab/make_og_cover.py` from the repo root.

Notes:
  * The two TTF faces (Archivo Black, Bebas Neue) have no U+2665 GLYPH, so the
    heart in the brand mark is drawn as a symmetrised parametric vector shape
    rather than typeset from a font.
  * Everything is rendered at 3x and downsampled with LANCZOS for clean edges;
    the heart is stamped from an 8x symmetrised mask so it is exactly mirrored.
"""

from __future__ import annotations

import math
import os

from PIL import Image, ImageDraw, ImageFont

# ---------------------------------------------------------------- config ----
W, H = 1200, 630
BG = "#070709"
RED = "#e51e2b"
TEXT = "#f7f4ea"
MUTED = "#9a9aa6"

ARCHIVO = "C:/Users/LENOVO LEGION/work/archivo-black-400.ttf"
BEBAS = "C:/Users/LENOVO LEGION/work/bebas-neue-400.ttf"

OUT = "assets/images/og-cover.jpg"

NAME = "Alif Adwitiya Pratama"
ROLE = "Collection Systems \u00b7 Data & Applied AI"
TAGLINE = "Built 4 Life \u2014 From real life needs to real life solutions."
TAGLINE_LINES = ("Built 4 Life \u2014", "From real life needs to real life solutions.")


def _heart_mask(size: int, ss: int = 8, steps: int = 4000) -> Image.Image:
    """Return a greyscale mask of a clean, exactly left/right symmetric heart.

    Uses the classic parametric heart
        x = 16 sin^3 t
        y = 13 cos t - 5 cos 2t - 2 cos 3t - cos 4t
    rendered at `ss`x and intersected with its own mirror image so the result is
    pixel-perfect symmetric, then downsampled to a tight box of width `size`.
    """
    dim = size * ss
    raw = Image.new("L", (dim, dim), 0)
    d = ImageDraw.Draw(raw)

    pts = []
    for i in range(steps):
        t = 2.0 * math.pi * i / steps
        x = 16.0 * math.sin(t) ** 3
        y = (13.0 * math.cos(t) - 5.0 * math.cos(2 * t)
             - 2.0 * math.cos(3 * t) - math.cos(4 * t))
        pts.append((x, y))
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    scale = size * ss / (max(xs) - min(xs))
    y_mid = (max(ys) + min(ys)) / 2.0
    x_mid = (max(xs) + min(xs)) / 2.0
    c = dim / 2.0
    d.polygon([(c + (x - x_mid) * scale, c - (y - y_mid) * scale)
               for x, y in pts], fill=255)

    arr = raw.load()
    for y in range(dim):
        for x in range(dim // 2):
            v = min(arr[x, y], arr[dim - 1 - x, y])
            arr[x, y] = v
            arr[dim - 1 - x, y] = v

    return raw.resize((size, size), Image.LANCZOS)


def heart_stamp(width: int, color: str, ss: int = 8) -> Image.Image:
    """Return a tight-cropped RGBA heart stamp of the given pixel width."""
    mask = _heart_mask(width, ss=ss)
    bbox = mask.getbbox()
    mask = mask.crop(bbox)
    stamp = Image.new("RGBA", mask.size, (0, 0, 0, 0))
    solid = Image.new("RGBA", mask.size, color)
    stamp.paste(solid, (0, 0), mask)
    return stamp


# Right-hand diagonal band. The band's left edge is a straight line from
# (BAND_TOP, 0) to (BAND_BOT, H); every text element is kept clear of it.
BAND_TOP = 900.0
BAND_BOT = 690.0


def _band_left_edge(y: float) -> float:
    """x of the diagonal band's left edge at vertical position y."""
    return BAND_TOP + (BAND_BOT - BAND_TOP) * (y / H)


def main() -> None:
    S = 3  # supersampling factor for text + background
    im = Image.new("RGB", (W * S, H * S), BG)
    d = ImageDraw.Draw(im)

    def px(v: float) -> int:
        return int(round(v * S))

    # --- backdrop: off-axis geometry + faint grid (Persona-style frame) -----
    # Right band sits well clear of the text column so nothing can collide.
    d.polygon([(px(BAND_TOP), 0), (px(W), 0), (px(W), px(H)), (px(BAND_BOT), px(H))],
              fill="#100809")
    d.line([(px(BAND_TOP), 0), (px(BAND_BOT), px(H))], fill=RED, width=5 * S)
    d.line([(px(BAND_TOP + 26), 0), (px(BAND_BOT + 26), px(H))], fill="#2a1012", width=2 * S)
    for x in range(120, W, 120):
        d.line([(px(x), 0), (px(x), px(H))], fill="#0e0e13", width=S)
    for y in range(90, H, 90):
        d.line([(0, px(y)), (px(W), px(y))], fill="#0e0e13", width=S)

    # --- fonts --------------------------------------------------------------
    f_brand = ImageFont.truetype(ARCHIVO, 92 * S)
    f_name = ImageFont.truetype(ARCHIVO, 56 * S)
    f_role = ImageFont.truetype(BEBAS, 42 * S)
    f_tag = ImageFont.truetype(BEBAS, 36 * S)

    LM = 80  # left margin

    # --- 1. brand mark "4 LIFE" with a real vector heart --------------------
    y_brand = 74
    w4 = d.textlength("4", font=f_brand) / S
    wlife = d.textlength("LIFE", font=f_brand) / S

    d.text((px(LM), px(y_brand)), "4", fill=TEXT, font=f_brand)

    heart_w = 58
    gap = 12
    heart_x = LM + w4 + gap
    d.text((px(heart_x + heart_w + gap), px(y_brand)), "LIFE", fill=RED, font=f_brand)

    # red underline accent spanning the brand mark
    brand_w = (heart_x + heart_w + gap + wlife) - LM
    uy = y_brand + 108
    d.rectangle([px(LM), px(uy), px(LM + brand_w), px(uy + 8)], fill=RED)

    # --- 2. name ------------------------------------------------------------
    y_name = uy + 54
    d.text((px(LM), px(y_name)), NAME, fill=TEXT, font=f_name)

    # --- 3. role line -------------------------------------------------------
    y_role = y_name + 82
    d.text((px(LM), px(y_role)), ROLE, fill=MUTED, font=f_role)

    # --- 4. tagline (wrapped to two lines for preview legibility) -----------
    y_tag = y_role + 66
    d.line([(px(LM), px(y_tag - 20)), (px(LM + 660), px(y_tag - 20))],
           fill="#24242d", width=2 * S)
    for i, line in enumerate(TAGLINE_LINES):
        d.text((px(LM), px(y_tag + i * 44)), line, fill=TEXT, font=f_tag)

    # (No orphan footer dot — it read as a stray artifact at preview size.)

    im = im.resize((W, H), Image.LANCZOS)

    # Stamp the brand heart on the final-size image so it stays crisp.
    heart = heart_stamp(heart_w, RED)
    im.paste(heart, (int(round(heart_x)), int(round(y_brand + 58 - heart.height / 2))),
             heart)

    # Right band: a large heart motif fills the void. Bright enough to read as
    # a deliberate graphic (a dim maroon heart vanished into the band).
    band_heart = heart_stamp(320, "#c04050")
    hx = int(round((BAND_TOP + 60 + W) / 2 - band_heart.width / 2))
    hy = int(round(H / 2 - band_heart.height / 2))
    im.paste(band_heart, (hx, hy), band_heart)

    # --- collision guard: every text right edge must clear the band ---------
    for label, right, y in (
        ("brand", LM + brand_w, uy),
        ("name", LM + d.textlength(NAME, font=f_name) / S, y_name),
        ("role", LM + d.textlength(ROLE, font=f_role) / S, y_role),
        ("tagline-1", LM + d.textlength(TAGLINE_LINES[0], font=f_tag) / S, y_tag),
        ("tagline-2", LM + d.textlength(TAGLINE_LINES[1], font=f_tag) / S, y_tag + 44),
    ):
        edge = _band_left_edge(y)
        assert right < edge - 12, (
            f"{label} right edge {right:.0f} collides with band edge {edge:.0f} at y={y}")

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    im.save(OUT, "JPEG", quality=90, optimize=True, progressive=True)

    size = os.path.getsize(OUT)
    print(f"wrote {OUT}  {im.size[0]}x{im.size[1]}  {size} bytes "
          f"({size / 1024:.1f} KB)")


if __name__ == "__main__":
    main()
