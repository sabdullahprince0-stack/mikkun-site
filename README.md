# MIKKUN portfolio

Static HTML/CSS/JavaScript homepage based on the [MIKKUN Figma design](https://www.figma.com/design/n9iTc4w6gQLcdP0znTss0Z/MIKKUN).
Reference frames: desktop homepage `1:2` at 1486px and updated mobile homepage
`104:2` at 390px. Original portfolio wording is retained.

## Run locally

```sh
node tools/serve.mjs
```

Open http://127.0.0.1:4173. Alternatively, use any static HTTP server.

## Assets

All eight main images are valid original PNG exports in `assets/`, with descriptive
names matching their slots. The mobile About photograph uses its full Figma source
as `about-mobile.jpg`. See [LOCAL-REVIEW.md](LOCAL-REVIEW.md) for the source mapping.

Figma decorative assets are local in `assets/design/`. Groteski Bold and the
handwritten Grunge TTF are in `assets/fonts/`. Inter, Jost, and Crimson Text load
from Google Fonts. No temporary Figma asset URLs are used at runtime.

## Visual verification

With the server running:

```sh
node tools/review.mjs
```

Requires Node 22+ and Chrome at its standard Windows installation path.
Saves full-page and hero screenshots at 1486px, 390px, and 1800px to `.local-review/`,
plus a browser report. Checks active image integrity, decoding, visible pixels,
geometry, font faces, menu behavior, and JavaScript exceptions. Existing Figma
reference screenshots enable side-by-side comparisons.

Motion uses a native editorial title sequence, distinct section reveals, small
desktop pointer movement, and scroll separation. Reduced-motion mode shows the
completed composition immediately. See [MOTION-REVIEW.md](MOTION-REVIEW.md) for the
local replay page, timing, and motion verification commands.

The project detail pages and Side Quests detail page have not been built yet.
Their existing links are retained for that later work.
