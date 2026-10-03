"""make_portrait.py — turn the studio photo into a transparent cutout.

Pipeline: learned matting (rembg / bria-rmbg) is the PRIMARY method because the
source is a dark subject on a dark, vignetted backdrop — the vignette glow behind
the head is *brighter* than the shadowed suit, so no global threshold can
separate them (verified: vignette val ~94, suit val ~74). rembg produced a clean
matte (head:shoulder ratio 1.16, ring-around-head alpha ~3).

A dependency-free threshold method is kept as a FALLBACK for when rembg/model is
unavailable, but it is known to leave a halo on this particular photo.

Outputs (into assets/images/):
  profile-cutout-single.png   RGBA cutout, 4/5 framed with headroom
  profile-cutout-single.webp  same, web-optimised
  profile-depth.png           grayscale pseudo-depth (optional parallax)

No network, no upload — local processing only (rembg downloads its model once).
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, "assets", "source", "profile-linkedin.jpg")
OUTDIR = os.path.join(ROOT, "assets", "images")
os.makedirs(OUTDIR, exist_ok=True)


def log(*a):
    print(*a, flush=True)


def matte_rembg(im):
    """Learned matting. Returns RGBA or None if unavailable."""
    try:
        from rembg import remove, new_session
    except Exception as e:
        log("rembg unavailable (%s) -> fallback" % e)
        return None
    try:
        session = new_session("bria-rmbg")
        return remove(im, session=session)
    except Exception as e:
        log("rembg failed (%s) -> fallback" % e)
        return None


def matte_threshold(im):
    """Dependency-free fallback. Known to leave a halo on this photo."""
    from scipy import ndimage

    a = np.asarray(im).astype(np.float32)
    val = a.max(2)
    spread = a.max(2) - a.min(2)
    cand = (val < 70) & (spread < 12)
    lbl, _ = ndimage.label(cand)
    border = set(lbl[0, :]) | set(lbl[-1, :]) | set(lbl[:, 0]) | set(lbl[:, -1])
    border.discard(0)
    bg = np.isin(lbl, list(border))
    subj = ~bg
    sl, sn = ndimage.label(subj)
    sizes = ndimage.sum(np.ones_like(sl), sl, range(1, sn + 1))
    subj = sl == int(np.argmax(sizes)) + 1
    subj = ndimage.binary_fill_holes(ndimage.binary_closing(subj, np.ones((11, 11)), iterations=2))
    subj = ndimage.binary_opening(subj, np.ones((5, 5)))
    alpha = Image.fromarray((subj * 255).astype(np.uint8), "L").filter(ImageFilter.GaussianBlur(2.0))
    out = im.convert("RGBA")
    out.putalpha(alpha)
    return out


def main():
    im = Image.open(SRC).convert("RGB")
    log("source:", SRC, im.size)

    rgba = matte_rembg(im)
    method = "rembg"
    if rgba is None:
        rgba = matte_threshold(im)
        method = "threshold"
    log("matte method:", method, "| size:", rgba.size)

    alpha = np.asarray(rgba)[..., 3]
    op = alpha > 128
    if op.sum() < 0.05 * op.size:
        log("WARNING: matte covers <5%% of the frame; check the source")

    # 1. trim to the alpha bbox
    bbox = Image.fromarray(alpha, "L").getbbox()
    if bbox:
        rgba = rgba.crop(bbox)

    # 2. reframe to a 4/5 portrait centred on the head, with headroom so CSS
    #    'cover' never clips the hair.
    am = np.asarray(rgba)[..., 3] > 128
    yy = np.where(am.any(axis=1))[0]
    top, bot = int(yy.min()), int(yy.max())
    yh = top + int(0.10 * (bot - top))
    xx = np.where(am[yh])[0]
    cx = (int(xx.min()) + int(xx.max())) // 2
    H = bot - top
    box_h = H / 0.87               # account for 10% top + 3% bottom padding
    tw = int(box_h * 0.8)          # 4/5
    X0 = max(0, cx - tw // 2)
    X1 = min(rgba.size[0], X0 + tw)
    X0 = max(0, X1 - tw)
    rgba = rgba.crop((X0, top, X1, bot + 1))

    pw, ph = rgba.size
    pt, ps, pb = int(ph * 0.10), int(pw * 0.04), int(ph * 0.03)
    canvas = Image.new("RGBA", (pw + ps * 2, ph + pt + pb), (0, 0, 0, 0))
    canvas.paste(rgba, (ps, pt), rgba)
    rgba = canvas
    log("framed portrait:", rgba.size, "aspect=%.3f" % (rgba.size[0] / rgba.size[1]))

    # 3. downscale for web (proportional!)
    target_h = 1100
    if rgba.size[1] > target_h:
        r = target_h / rgba.size[1]
        rgba = rgba.resize((max(1, int(rgba.size[0] * r)), target_h), Image.LANCZOS)

    png = os.path.join(OUTDIR, "profile-cutout-single.png")
    rgba.save(png)
    webp = os.path.join(OUTDIR, "profile-cutout-single.webp")
    rgba.save(webp, quality=90, method=6)
    log("saved:", png, os.path.getsize(png), "b")
    log("saved:", webp, os.path.getsize(webp), "b")

    # 4. pseudo-depth map (optional): alpha * vertical falloff (head brighter)
    al = np.asarray(rgba)[..., 3].astype(np.float32) / 255.0
    yy2 = np.linspace(1.0, 0.45, rgba.size[1])[:, None]
    depth = (al * yy2 * 255).astype(np.uint8)
    dimg = Image.fromarray(depth, "L").filter(ImageFilter.GaussianBlur(3))
    dp = os.path.join(OUTDIR, "profile-depth.png")
    dimg.save(dp)
    log("saved:", dp, os.path.getsize(dp), "b")

    # 5. manifest for the front-end (no blind probing, no 404s)
    manifest = {
        "_comment": "Generated by lab/make_portrait.py. single=default; torso/head optional split.",
        "portrait": {
            "single": "profile-cutout-single.webp",
            "torso": None,
            "head": None,
            "mask": "profile-depth.png",
            "method": method,
        },
    }
    with open(os.path.join(OUTDIR, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    log("manifest updated | method=%s" % method)

    cov = float((np.asarray(rgba)[..., 3] > 128).mean())
    log("MATTE_COVERAGE %.3f" % cov)
    return 0


if __name__ == "__main__":
    sys.exit(main())
