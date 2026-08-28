# tools

Scripts that generate the README assets in `docs/`. Not part of the site build.

| Script | Output |
|---|---|
| `render_pipeline_anim.py` | `docs/pipeline.gif`, `docs/pipeline.mp4` — the fan-out/collapse animation, rendered frame by frame rather than screen-recorded |
| `frame_shot.py` | Puts a screenshot on a gradient background with rounded corners and a drop shadow |

## Setup

Fonts are not committed. Fetch and convert them once:

```bash
cd tools
mkdir -p fonts && cd fonts
for p in @fontsource/space-grotesk @fontsource/inter @fontsource/jetbrains-mono; do
  npm pack $p --silent
done
for f in *.tgz; do tar -xzf "$f"; done

uv run --with "fonttools[woff]" --with brotli python3 - <<'EOF'
from fontTools.ttLib import TTFont
import os
os.makedirs("ttf", exist_ok=True)
for w in ["space-grotesk-latin-600", "space-grotesk-latin-700",
          "inter-latin-400", "inter-latin-500",
          "jetbrains-mono-latin-500", "jetbrains-mono-latin-600"]:
    f = TTFont(f"package/files/{w}-normal.woff2")
    f.flavor = None
    f.save("ttf/" + w.replace("-latin-", "-") + ".ttf")
EOF

rm -rf package *.tgz
```

`ffmpeg` is also required for the encode step: `brew install ffmpeg`

## Regenerating

When the scenario numbers change, edit the `STAGES` list at the top of
`render_pipeline_anim.py` so it matches `src/VexillumDashboard.jsx`, then:

```bash
uv run --with pillow --with numpy python3 tools/render_pipeline_anim.py docs
```

Takes about fifteen seconds. Outputs land in `docs/` at roughly 130 KB (GIF)
and 50 KB (MP4).

To reframe a screenshot:

```bash
uv run --with pillow --with numpy python3 tools/frame_shot.py shot.png docs/hero.png
```
