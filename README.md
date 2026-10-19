# MIKKUN portfolio — homepage build

Static HTML/CSS/JS implementation based on the latest Figma desktop homepage and the `homepage mobile — updated hero` frame.

## Run locally

```bash
python -m http.server 4173
```

Then open `http://localhost:4173`.

## Required local assets

Put the exact exported Figma images in `assets/` using these filenames:

- `portrait.webp` — current transparent/cut-out hero portrait from the latest desktop hero
- `woodstones.webp` — WoodStones homepage preview
- `dbasement.webp` — D’Basement Open Mic artwork
- `haniyah.webp` — HANIYAH homepage/catalog preview
- `about.webp` — About portrait
- `running.webp` — running Side Quest image
- `racket.webp` — racket sports Side Quest image
- `music.webp` — music/live Side Quest image

The code intentionally does **not** contain or redistribute font files. The CSS expects `Groteski` and `Grunge` if you later provide licensed webfont files, and falls back gracefully until then.

## Motion currently implemented

- hero gradient drift
- MIKKUN entrance
- MULTIDISCIPLINARY / CREATIVE masked reveals
- portrait rise + fade
- manifesto / metadata entrance
- subtle desktop pointer parallax
- subtle scroll separation
- `prefers-reduced-motion` support

## Next

Once assets are exported and the homepage is visually approved, build the four remaining pages using the same structure: WoodStones, D’Basement, HANIYAH, Side Quests.
