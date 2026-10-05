# Homepage hero

This React island implements the approved centred hero and the six-scene
showpiece. The original static homepage below it retains its cream/black bands,
MVC colours, navigation, quotes, films and contact flow.

## Ownership

| Concern | Owner |
| --- | --- |
| Composition, spacing and responsive proportions | `HomepageHero.jsx`, `HomepageHero.module.css` |
| Headline, single-line desktop subtitle and command placement | `HeroIntro.jsx` |
| One-shot typewriter, copying and feedback | `Command.jsx`, `Command.module.css` |
| Frost, texture, liquid rendering and GPU lifecycle | `ambience/` |
| Chapters, product UI, interactions and choreography | `../showpiece/` |

The hero owns one `ShowpieceProvider` boundary. The scene system and ambient
field consume its playback Context, so the existing pause control, reduced
motion, offscreen suspension and document visibility govern both. The ambient
field maintains its own elapsed time: selecting or replaying a chapter does
not reset the liquid. Per-frame GPU work is outside React rendering; the
imperative renderer is isolated behind the declarative `AmbientField` component.

The command types once into a fixed 400px control, then settles. Its accessible
name and clipboard value always contain the complete command. Reduced motion
shows the complete command immediately; failed copying exposes selectable text.

The atmosphere is the approved dim mercury/plasma/silk field, diffused through
stationary frost. The renderer deforms its coordinates without recolouring it.
The original image remains available beneath the canvas for graceful fallback.

## Iterating without drift

Edit these hero files to change the surrounding composition. Do not target
scene internals from hero CSS. Edit a scene inside its own folder and follow the
showpiece README for its product invariants and deterministic timeline checks.
Keep original model marks and preserve the single-line desktop subtitle; allow
natural wrapping on smaller screens. No secondary CTA shares the command row.

```sh
npm run build
npx eslint src/homepage src/showpiece
node --test src/showpiece/playback/playbackStore.test.mjs \
  src/showpiece/scenes/live/liveFrame.test.js \
  src/showpiece/scenes/delivery/deliveryFrame.test.mjs
```

Review desktop and compact layouts, typewriter/copy states, all six chapters,
pause/replay, reduced motion, offscreen resumption and WebGL-unavailable fallback.
