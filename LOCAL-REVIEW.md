# Local Figma verification — 2026-10-19

Implemented against the MIKKUN Figma file: desktop homepage `1:2` at 1486px and
**homepage mobile — updated hero** `104:2` at 390px. Compared exported Figma
screenshots with actual Chrome renders side by side.

## Asset repair

All eight supplied PNGs were copied without re-encoding. Their hashes match the
original exports in `assets/mikkun-original-assets/`. Removed the old WebP files,
which included invalid headers, truncated payloads, and blank decoded images.

| Supplied original | Runtime asset | Bytes |
| --- | --- | ---: |
| IMG_7695 1.png | assets/portrait.png | 242,441 |
| Rectangle.png | assets/woodstones.png | 346,311 |
| rectangle2.png | assets/dbasement.png | 578,180 |
| Rectangle3.png | assets/haniyah.png | 238,721 |
| Rectangle4.png | assets/about.png | 219,465 |
| Rectangle5.png | assets/racket.png | 321,272 |
| Rectangle6.png | assets/music.png | 284,132 |
| Rectangle7.png | assets/running.png | 257,944 |

The mobile About slot uses `assets/about-mobile.jpg`, the same photograph's full
source from Figma, because that frame shows more than the supplied desktop crop.
Its actual format is JPEG; the extension and HTTP type match. The supplied cutout
portrait is used at both widths. No photographs were generated.

Figma gradients, contours, textures, and decorative frames are saved in
`assets/design/`. No temporary Figma asset URLs appear in runtime HTML/CSS.
Groteski Bold and the handwritten Grunge TTF are loaded from `assets/fonts/`;
the installed Grunge OTF has different letterforms and is not used.

## Layout changes

- Figma gradient colors, typography, contours, textured statement strip,
  project backing shapes, section dividers, and page border.
- Hero cutout and typography overlap, left manifesto and metadata, lower-right
  scroll indicator, and scratch marks. Header layering follows the design.
- Header remains aligned with the centered page beyond the 1486px width cap.
- Mobile follows the updated frame: upper-right MIKKUN, handwritten titles,
  large portrait cropped at the right edge, and compact manifesto over the image.
- Corrected About photo framing and text flow; retained staggered desktop and
  three-column mobile Side Quests arrangements.
- Reduced-motion mode displays the finished layout immediately, without masked
  lettering or delayed invisible metadata.

Repository wording is retained where it differs from Figma, including project
paragraphs and categories. The mobile Figma frame is 4325px high and clips the
contact/footer. The local page retains the existing full footer, ending near 4443px.

## Verification

Chrome checked at 1486px and 390px, without scrollbar deduction from the layout
widths. Also checked 1800px to verify the centered 1486px page cap.

- All eight active images decode successfully and contain visible pixels.
- PNG signatures/end chunks and JPEG signature/end marker pass integrity checks.
- The mobile menu opens and closes after selecting a link.
- No JavaScript exceptions during these checks.
- No horizontal page overflow at the requested widths.
- Browser font inspection confirms local Groteski and Grunge faces.
- JavaScript syntax checks and `git diff --check` pass.

Artifacts in `.local-review/` (ignored by Git):

- `1486.png`, `390.png`: full local pages.
- `1486-hero.png`, `390-hero.png`: local hero previews.
- `1486-hero-comparison.png`, `390-hero-comparison.png`: reference on the left,
  local render on the right. Other section comparisons follow the same naming.
- `report.json`: image integrity, decoding, visible pixels, rendered dimensions,
  font faces, mobile menu checks, and JavaScript exceptions.

Four existing detail-page links still point to pages not yet built:
`woodstones.html`, `dbasement.html`, `haniyah.html`, and `side-quests.html`.
Those pages are outside this homepage task. Nothing was committed or pushed.

## Repeat locally

Run `node tools/serve.mjs`, then visit http://127.0.0.1:4173.
In another terminal run `node tools/review.mjs`.
Requires Node 22+ and Chrome at the standard Windows installation path.
Browser execution permission may be required. No npm packages are needed.

The review exits with status 1 for an unusable active image or JavaScript exception.
Side-by-side comparisons are generated when the Figma reference PNGs are present
in `.local-review/`.
