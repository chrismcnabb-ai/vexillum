#!/usr/bin/env python3
"""
Frame a UI screenshot on a gradient background with rounded corners and a soft
drop shadow. Colors are pulled from the Vexillum palette so the frame reads as
part of the product rather than a generic template.

usage:  python3 frame_shot.py input.png output.png [--light]
"""
import sys
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

RADIUS = 14          # screenshot corner radius
PAD_X = 120          # side padding
PAD_TOP = 110
PAD_BOTTOM = 140     # heavier bottom so the shadow has room to fall
SHADOW_OFFSET = 30
SHADOW_BLUR = 55
SHADOW_ALPHA = 150


def gradient(w, h, c1, c2, c3):
    """Diagonal three-stop gradient."""
    y = np.linspace(0, 1, h)[:, None]
    x = np.linspace(0, 1, w)[None, :]
    t = np.clip(y * 0.78 + x * 0.22, 0, 1)
    c1, c2, c3 = map(np.array, (c1, c2, c3))
    lo = c1 + (c2 - c1) * np.clip(t / 0.5, 0, 1)[..., None]
    hi = c2 + (c3 - c2) * np.clip((t - 0.5) / 0.5, 0, 1)[..., None]
    out = np.where(t[..., None] < 0.5, lo, hi)
    return Image.fromarray(out.astype(np.uint8), "RGB")


def glow(canvas, cx, cy, radius, color, strength):
    """Soft radial light behind the card, for depth."""
    w, h = canvas.size
    layer = Image.new("RGB", (w, h), (0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=color)
    layer = layer.filter(ImageFilter.GaussianBlur(radius * 0.55))
    a = np.array(canvas).astype(np.float32)
    b = np.array(layer).astype(np.float32) * strength
    return Image.fromarray(np.clip(a + b, 0, 255).astype(np.uint8), "RGB")


def rounded_mask(size, radius):
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1],
                                        radius=radius, fill=255)
    return m


def main():
    src = sys.argv[1]
    dst = sys.argv[2] if len(sys.argv) > 2 else "framed.png"
    light = "--light" in sys.argv

    shot = Image.open(src).convert("RGB")
    sw, sh = shot.size
    W, H = sw + PAD_X * 2, sh + PAD_TOP + PAD_BOTTOM

    if light:
        # neutral warm-grey, for a light-themed page
        canvas = gradient(W, H, (233, 235, 240), (222, 226, 234), (206, 212, 224))
        border = (255, 255, 255, 200)
    else:
        # Vexillum ink palette: deep navy → slate-blue
        canvas = gradient(W, H, (8, 12, 22), (17, 25, 43), (28, 38, 62))
        canvas = glow(canvas, int(W * 0.22), int(H * 0.14), int(W * 0.34), (20, 78, 92), 0.55)
        canvas = glow(canvas, int(W * 0.86), int(H * 0.78), int(W * 0.30), (58, 38, 96), 0.45)
        canvas = glow(canvas, int(W * 0.52), int(H * 0.05), int(W * 0.22), (60, 48, 14), 0.30)
        border = (255, 255, 255, 34)

    canvas = canvas.convert("RGBA")
    mask = rounded_mask((sw, sh), RADIUS)

    # drop shadow: blurred silhouette of the card, offset downward
    sil = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sil).rounded_rectangle(
        [PAD_X, PAD_TOP + SHADOW_OFFSET, PAD_X + sw, PAD_TOP + sh + SHADOW_OFFSET],
        radius=RADIUS, fill=(0, 0, 0, SHADOW_ALPHA))
    sil = sil.filter(ImageFilter.GaussianBlur(SHADOW_BLUR))
    canvas = Image.alpha_composite(canvas, sil)

    # the screenshot itself
    canvas.paste(shot, (PAD_X, PAD_TOP), mask)

    # hairline border to separate the dark card from the dark background
    edge = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(edge).rounded_rectangle(
        [PAD_X, PAD_TOP, PAD_X + sw - 1, PAD_TOP + sh - 1],
        radius=RADIUS, outline=border, width=1)
    canvas = Image.alpha_composite(canvas, edge)

    out = canvas.convert("RGB")
    out.save(dst, "PNG", optimize=True)
    print(f"{dst}  {out.size[0]}x{out.size[1]}")


if __name__ == "__main__":
    main()
