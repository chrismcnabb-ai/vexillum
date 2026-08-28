#!/usr/bin/env python3
"""
Render the Vexillum "fan-out, then collapse" panel as an animation, frame by
frame, matching the live UI's staging and easing.

Outputs docs/pipeline.gif and docs/pipeline.mp4.

Edit STAGES below when the scenario numbers change, then rerun.

usage:  python3 render_pipeline_anim.py [outdir]
"""
import os, sys, shutil, subprocess
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np

# ── scenario ──────────────────────────────────────────────────────────────
STAGES = [
    ("Ingest",      100, "normalized findings",  "cyan",    "code"),
    ("Attribution", 900, "app × package × CVE",  "rose",    "code"),
    ("Collapse",     22, "distinct CVEs",        "emerald", "code"),
    ("Profile",       4, "model calls needed",   "violet",  "model"),
    ("Assess",      900, "assessments",          "cyan",    "code"),
    ("Guardrails",  845, "passed",               "cyan",    "code"),
    ("Disposition", 845, "auto-dispositioned",   "cyan",    "code"),
    ("VEX",         845, "statements",           "cyan",    "code"),
]
MAXN = 900

TITLE = "FAN-OUT, THEN COLLAPSE"
SUBTITLE = "The count explodes at attribution and collapses at profiling. Everything expensive happens at the narrowest point."
RIGHT_NOTE = "width = volume at each stage"

# ── timing ────────────────────────────────────────────────────────────────
FPS = 20
STAGGER = 0.42      # seconds between stages starting
FILL = 0.55         # seconds each bar takes to fill
HOLD_END = 1.8      # seconds held on the finished state
HOLD_START = 0.5    # seconds of empty state before it starts

# ── palette (matches the app) ─────────────────────────────────────────────
INK, INK2, LINE = (10, 15, 26), (15, 22, 38), (30, 41, 59)
TRACK = (13, 20, 34)
BAR = {"cyan": (22, 78, 99), "rose": (136, 19, 55),
       "emerald": (6, 95, 70), "violet": (76, 29, 149)}
TXT_HI, TXT_MID, TXT_LO, TXT_DIM = (226, 232, 240), (148, 163, 184), (100, 116, 139), (51, 65, 85)
CYAN, VIOLET, BRASS = (34, 211, 238), (167, 139, 250), (201, 162, 39)

# ── layout ────────────────────────────────────────────────────────────────
CARD_W, PAD = 1180, 30
LABEL_W, TAG_W, GAP = 132, 108, 16
ROW_H, ROW_GAP = 34, 9
HEAD_H = 104
CARD_H = HEAD_H + len(STAGES) * (ROW_H + ROW_GAP) + 26
OUTER_X, OUTER_TOP, OUTER_BOT = 92, 82, 108
W, H = CARD_W + OUTER_X * 2, CARD_H + OUTER_TOP + OUTER_BOT

FD = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts", "ttf")
def font(name, size):
    return ImageFont.truetype(os.path.join(FD, name + ".ttf"), size)

F_TITLE = font("space-grotesk-600", 15)
F_ROW   = font("space-grotesk-600", 14)
F_BODY  = font("inter-400", 13)
F_SMALL = font("inter-400", 12)
F_MONO  = font("jetbrains-mono-600", 14)
F_TAG   = font("inter-500", 11)


def ease_out_cubic(t):
    return 1 - (1 - t) ** 3


def gradient_bg(w, h):
    y = np.linspace(0, 1, h)[:, None]
    x = np.linspace(0, 1, w)[None, :]
    t = np.clip(y * 0.78 + x * 0.22, 0, 1)[..., None]
    c1, c2, c3 = np.array((8, 12, 22)), np.array((17, 25, 43)), np.array((28, 38, 62))
    lo = c1 + (c2 - c1) * np.clip(t / 0.5, 0, 1)
    hi = c2 + (c3 - c2) * np.clip((t - 0.5) / 0.5, 0, 1)
    img = Image.fromarray(np.where(t < 0.5, lo, hi).astype(np.uint8), "RGB")
    for cx, cy, r, col, s in [(0.22, 0.14, 0.34, (20, 78, 92), 0.55),
                              (0.86, 0.80, 0.30, (58, 38, 96), 0.45),
                              (0.52, 0.04, 0.22, (60, 48, 14), 0.28)]:
        lay = Image.new("RGB", (w, h), (0, 0, 0))
        d = ImageDraw.Draw(lay)
        R = int(w * r); X, Y = int(w * cx), int(h * cy)
        d.ellipse([X - R, Y - R, X + R, Y + R], fill=col)
        lay = lay.filter(ImageFilter.GaussianBlur(R * 0.55))
        img = Image.fromarray(np.clip(np.array(img).astype(np.float32)
                                      + np.array(lay).astype(np.float32) * s, 0, 255).astype(np.uint8), "RGB")
    return img


BG = gradient_bg(W, H)


def shadow_layer():
    sil = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sil).rounded_rectangle(
        [OUTER_X, OUTER_TOP + 26, OUTER_X + CARD_W, OUTER_TOP + CARD_H + 26],
        radius=13, fill=(0, 0, 0, 150))
    return sil.filter(ImageFilter.GaussianBlur(48))


SHADOW = shadow_layer()


def render(t):
    """One frame at time t seconds."""
    base = Image.alpha_composite(BG.convert("RGBA"), SHADOW)
    card = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(card)

    x0, y0 = OUTER_X, OUTER_TOP
    d.rounded_rectangle([x0, y0, x0 + CARD_W, y0 + CARD_H], radius=13,
                        fill=INK2 + (255,), outline=LINE + (255,), width=1)

    d.text((x0 + PAD, y0 + 24), TITLE, font=F_TITLE, fill=TXT_MID)
    rw = d.textlength(RIGHT_NOTE, font=F_SMALL)
    d.text((x0 + CARD_W - PAD - rw, y0 + 25), RIGHT_NOTE, font=F_SMALL, fill=TXT_LO)
    d.text((x0 + PAD, y0 + 50), SUBTITLE, font=F_BODY, fill=TXT_LO)

    bar_x = x0 + PAD + LABEL_W + GAP
    bar_w = CARD_W - PAD * 2 - LABEL_W - TAG_W - GAP * 2

    for i, (name, n, unit, tone, tag) in enumerate(STAGES):
        y = y0 + HEAD_H + i * (ROW_H + ROW_GAP)
        start = HOLD_START + i * STAGGER
        p = ease_out_cubic(min(max((t - start) / FILL, 0.0), 1.0))
        on = t >= start

        lw = d.textlength(name, font=F_ROW)
        d.text((bar_x - GAP - lw, y + 9), name, font=F_ROW,
               fill=TXT_HI if on else TXT_DIM)

        d.rounded_rectangle([bar_x, y, bar_x + bar_w, y + ROW_H], radius=3, fill=TRACK)
        full = max(0.035, n / MAXN) * bar_w
        w_now = int(full * p)
        if w_now > 3:
            fill_img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            ImageDraw.Draw(fill_img).rounded_rectangle(
                [bar_x, y, bar_x + w_now, y + ROW_H], radius=3, fill=BAR[tone] + (255,))
            card = Image.alpha_composite(card, fill_img)
            d = ImageDraw.Draw(card)

        shown = int(round(n * p))
        num = f"{shown:,}" if on else "—"
        d.text((bar_x + 13, y + 9), num, font=F_MONO, fill=TXT_HI if on else TXT_DIM)
        nw = d.textlength(num, font=F_MONO)
        d.text((bar_x + 13 + nw + 10, y + 10), unit, font=F_BODY,
               fill=TXT_MID if on else TXT_DIM)

        if on:
            tx = bar_x + bar_w + GAP
            is_model = tag == "model"
            col = VIOLET if is_model else CYAN
            tw = d.textlength(tag, font=F_TAG)
            d.rounded_rectangle([tx, y + 8, tx + tw + 26, y + 27], radius=4,
                                fill=(col[0], col[1], col[2], 26), outline=(col[0], col[1], col[2], 90))
            d.ellipse([tx + 9, y + 15, tx + 15, y + 21], fill=col)
            d.text((tx + 20, y + 11), tag, font=F_TAG, fill=col)

    return Image.alpha_composite(base, card).convert("RGB")


def main():
    outdir = sys.argv[1] if len(sys.argv) > 1 else "docs"
    os.makedirs(outdir, exist_ok=True)
    tmp = "_frames"
    shutil.rmtree(tmp, ignore_errors=True)
    os.makedirs(tmp)

    total = HOLD_START + (len(STAGES) - 1) * STAGGER + FILL + HOLD_END
    n = int(total * FPS)
    for f in range(n):
        render(f / FPS).save(f"{tmp}/f{f:04d}.png")
    print(f"rendered {n} frames ({total:.1f}s @ {FPS}fps) at {W}x{H}")

    mp4 = os.path.join(outdir, "pipeline.mp4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS),
                    "-i", f"{tmp}/f%04d.png", "-vf", "scale=1000:-2:flags=lanczos",
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20",
                    "-movflags", "+faststart", mp4], check=True)

    pal = f"{tmp}/palette.png"
    vf = "fps=%d,scale=900:-1:flags=lanczos" % FPS
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", f"{tmp}/f%04d.png",
                    "-vf", vf + ",palettegen=max_colors=200:stats_mode=diff", pal], check=True)
    gif = os.path.join(outdir, "pipeline.gif")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", f"{tmp}/f%04d.png",
                    "-i", pal, "-lavfi", vf + "[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3",
                    "-loop", "0", gif], check=True)

    shutil.rmtree(tmp, ignore_errors=True)
    for p in (gif, mp4):
        print(f"{p}  {os.path.getsize(p)/1e6:.2f} MB")


if __name__ == "__main__":
    main()
