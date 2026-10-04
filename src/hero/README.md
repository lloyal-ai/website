# Homepage product motion

This replaces the former two-column scaffold GIF hero. It starts with **Compose**,
then cycles through **Inspect** and **Build**, with 14 seconds per scene. The
illustrations are DOM and SVG driven by GSAP; the hero downloads no video.

## Source assets

The artwork and product narratives come from the existing editable film projects:

- `Zero-to-Shipped-AI-App-Editable-Project.zip`: Field Note app, model provisioning,
  research brief, and packaged application. `ship-source.js` retains the recovered
  deterministic frame renderer; `ship.js` gives it the shared GSAP lifecycle.
- `Composition-of-Models-Editable-Project.zip`: Atelier and the Arc lamp. The
  reasoning → image specialist → live context sequence is adapted in `compose.js`.
- `Lloyal-DevTools-Editable-Project.zip`: shared context, research branches, and
  captured entropy/surprisal curves for research #3, adapted in `inspect.js`.

These are illustrated walkthroughs. Event timing and branch bars are editorial,
not live telemetry or performance measurements. Entropy and surprisal describe
model generation; they are not confidence scores. The shipped application acquires
model weights on first launch. The displayed notarization command targets macOS.

Reference research into Mastra, DeepSeek Harness, and Cohere informed the use of
responsive browser-native product sequences. No code or artwork from those sites
is included. Hero font files retain their SIL Open Font License in
`public/assets/hero/Inter-LICENSE.txt`.

## Behavior and editing

`main.js` controls selection, progress, playback, and cleanup. Each scene mount
returns a paused `timeline`, a readable `still` time, and a `duration`. Keep all
selectors scoped to their scene and use the `hero-stage` container for breakpoints.
The static Arc illustration stays visible if JavaScript cannot load.

- Manual tabs support arrows, Home, and End. Keyboard selection pauses cycling.
- The pause control stops scene motion and entrance transitions.
- Offscreen or hidden pages suspend playback.
- Reduced-motion preference selects completed stills and disables playback.
- Illustration details are hidden from assistive technology in favor of concise
  scene descriptions. Only the active tabpanel is exposed.

Validation for this change: production Vite build, scoped ESLint, rendered layouts
at 320/390/768/1440 px, all three automatic transitions, pause/resume, keyboard
selection, offscreen suspension, visibility handling, reduced motion, and the
no-JavaScript fallback.
