# Motion approval — local only

Run `node tools/serve.mjs` and open
<http://127.0.0.1:4173/.local-review/motion/index.html>. This review page replays the real site
at 1486px and 390px and can jump directly to each section. It is ignored by Git.

## Motion direction

| Scene | Motion |
| --- | --- |
| Hero | MIKKUN horizontal cut, MULTIDISCIPLINARY left-to-right behind the portrait, CREATIVE right-to-left; delayed copy and metadata |
| Portrait | 36px rise / 1.035 scale on desktop; 26px / 1.03 on mobile, both resolving to the approved position |
| Gradient | Very slow 18s bloom on desktop, softer 24s cycle on mobile; pauses out of view and in background tabs |
| WoodStones | Measured horizontal apertures and short architectural registration |
| D’Basement | Quicker opposing poster cuts with a restrained diagonal settle |
| HANIYAH | Slow vertical aperture, near-imperceptible scale settle, gentler text pacing |
| About | Masked photo, then headline and staggered editorial copy |
| Side Quests | Slightly varied card offsets and a small stagger, returning to the original grid |
| Contact | Decisive bottom-to-top typographic reveal, followed by contact details |

All effects use native Web Animations, IntersectionObserver, CSS animation, and a
requestAnimationFrame loop for hero depth. There are no animation dependencies.
No layout properties, image files, wording, or layout wrappers were changed.
Finished reveal animations are cancelled after restoring normal CSS; they do not
leave masks, transformed stacking contexts, or promoted layers behind.

Desktop pointer parallax is capped at 5px horizontally and 3.5px vertically on the
portrait, with smaller opposing movement on the titles. The rAF loop sleeps after
the pointer settles. Mobile has no pointer parallax and uses shorter entrances and
smaller scroll separation. Reveals play once as their actual elements enter view;
the project wrappers use `display: contents`, so those wrappers are not observed.

Reduced-motion mode shows the finished composition immediately. Switching the
preference during playback cancels all reveals and depth movement. Without
JavaScript, the original content remains visible.

## Verification artifacts

Run `node tools/motion-review.mjs` with the local server running. It requires Chrome
and Node 22+, as does the existing static review tool.

Artifacts under `.local-review/motion/` include hero and section filmstrips for
both widths, sampled frames, reduced-motion full-page captures, and `report.json`.
The review checks entrance timing, pointer behavior, differential scroll movement,
settled section visibility, layout shifts, reduced-motion cancellation, pixel
comparison with the approved screenshots, and unchanged asset hashes.

Verified at both widths: zero recorded layout shift, no JavaScript exceptions,
all section headings settled with opacity 1 and no remaining animation transform,
and zero resting rAF callbacks. Pointer movement affected desktop only. Changing
to reduced motion left zero running effects, pending reveals, or hero translations.
All asset hashes are unchanged. The desktop static screenshot matches exactly;
the mobile comparison has 321 differing pixels (0.019%) within the portrait only,
with identical asset bytes and page dimensions. The comparison reports this
small rasterization variation rather than treating it as a layout change.

Nothing has been committed or pushed. Motion is awaiting approval.
