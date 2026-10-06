# Homepage hero

This React island implements the approved centred hero and the five-scene
showpiece. The original static homepage below it retains its cream/black bands,
MVC colours, navigation, quotes, films and contact flow.

## Ownership

| Concern | Owner |
| --- | --- |
| Composition, spacing and responsive proportions | `HomepageHero.jsx`, `HomepageHero.module.css` |
| Headline, subtitle line breaks and command placement | `HeroIntro.jsx` |
| Shared hero/closing terminal command, one-shot typewriter, copying and feedback | `Command.jsx`, `Command.module.css` |
| Frost, texture, liquid rendering and GPU lifecycle | `ambience/` |
| Chapters, product UI, interactions and choreography | `../showpiece/` |

The hero owns one `ShowpieceProvider` boundary. The scene system and ambient
field consume its playback Context, so the existing pause control, reduced
motion, offscreen suspension and document visibility govern both. The ambient
field maintains its own elapsed time: selecting or replaying a chapter does
not reset the liquid. Per-frame GPU work is outside React rendering; the
imperative renderer is isolated behind the declarative `AmbientField` component.

Both command placements use `Command` with the same 400px rounded black surface,
green shell prompt, muted runner and bright command. The hero types once, then
settles; the closing instance uses `animate={false}` to show the complete command
immediately. Each instance owns its copy feedback. The accessible name and
clipboard value always contain the complete command. Reduced motion skips typing;
failed copying exposes selectable text.

The atmosphere is the approved dim mercury/plasma/silk field, diffused through
stationary frost. The renderer deforms its coordinates without recolouring it.
The original image remains available beneath the canvas for graceful fallback.

Site and hero typography use the shared `--sans` token: the self-hosted Readex
Pro variable font. The showpiece deliberately keeps Inter for its illustrated
UI and architecture. Terminal commands and code retain their monospace font.

Context, shader, image, texture-upload and first-draw failures retain the
still-image fallback. Failed renderers stop scheduling frames; a restored WebGL
context can resume rendering with the original image.

Compose aligns its application window with the hero and journey on wide
screens, allowing the model rail into the left gutter. Its shared composition
offset reduces when the outer gutter cannot safely contain labels and menus;
compact layouts retain the models-above-app arrangement.

## Iterating without drift

Edit these hero files to change the surrounding composition. Do not target
scene internals from hero CSS. Edit a scene inside its own folder and follow the
showpiece README for its product invariants and deterministic timeline checks.
Keep original model marks and preserve the approved subtitle breaks; allow
natural wrapping on smaller screens. No secondary CTA shares the command row.

```sh
npm run build
npx eslint src/homepage src/showpiece
node --test src/showpiece/playback/playbackStore.test.mjs \
  src/showpiece/scenes/live/liveFrame.test.js \
  src/showpiece/scenes/delivery/deliveryFrame.test.mjs
```

Review desktop and compact layouts, typewriter/copy states, all five chapters,
pause/replay, reduced motion, offscreen resumption and WebGL-unavailable fallback.

## First paint and social previews

`npm run build` renders the hero and closing command into `dist/index.html`
from their React components. The browser hydrates these existing nodes rather
than replacing a differently sized placeholder. The initial composition uses
CSS container queries and percentage-based routes so its mobile layout is
already correct before JavaScript measures the stage. The approved liquid
still and local WOFF2 fonts are preloaded; motion is added after hydration.

Keep prerendered markup generated, not hand-maintained. `prerender.jsx` and
`../showpiece/entry.jsx` must wrap the same component trees. The simplified
source HTML fallback is only used by the development server.

`tools/social-preview.mjs` gives the social image a content hash, and uses the
Cloudflare branch preview origin when `WORKERS_CI_BRANCH` is not `main`.
Production builds use `https://lloyal.ai`. Each headline variant owns its
`public/assets/home-og.png` and matching image alt text. Regenerate that card
when changing the hero copy.
