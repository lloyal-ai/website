# Homepage showpiece

The approved six-scene storyboard is implemented as a React island in the existing
homepage. `index.html` retains the site header, content, analytics and a useful
no-JavaScript fallback; `entry.jsx` mounts the hero. The former imperative hero and its unused assets have been removed.

## Ownership boundaries

| Change | Owner |
| --- | --- |
| Hero typography, command, ambience and overall proportions | `../homepage/` |
| Scene stage, chapter controls and captions | `Showpiece.jsx`, `Showpiece.module.css` |
| Chapter order, duration, reduced-motion still and accessible description | `config.js` |
| Playback, seek, visibility, automatic chapter advance | `playback/` |
| Window chrome, model marks, icons, cursor, angular signals | `components/` |
| Shared functional colour tokens | `Showpiece.module.css` |
| A scene's choreography and interaction state | That scene's folder in `scenes/` |
| Interpolation and path mathematics | `motion/math.js` |

Scenes own their CSS Modules and render declaratively from time. There are no
document selectors, injected HTML, DOM-mutation timelines, or independent scene
clocks. Subcomponents receive local presentation values; cross-tree interaction
state uses Context. Compose has its own reducer/provider, while live control is
an isolated reducer with a pure frame projection.

Within delivery, `ShipTerminal` owns the developer shell and its CSS. It renders
the existing ship frame as sequential console output, separately from the
end-user provisioning interface in `DeliveryScenes`.

App accents inherit semantic CSS tokens: blue for app actions, selection and
activity; green for live, completed and ready states; red for recording and
destructive actions; grey for supporting or inactive content. Entropy remains
blue and surprisal grey/dashed, without a correctness judgment. Scene selectors
apply those roles locally. Outside the app windows, model tabs, tool calls,
connectors and reranker activity use separate silver orchestration tokens.
Composer abilities stay graphite/silver so they do not compete with primary
actions. Official model colours, graphite surfaces and the
page ambience remain independent. Shared window controls use macOS traffic-light
colours; the inspector's custom chrome uses the same tokens.

The homepage composes the playback provider around the showpiece and ambient
field. The provider exposes stable actions through Context. A single
requestAnimationFrame clock integrates the browser with `useSyncExternalStore`.
Frame subscribers and control subscribers are separate: advancing time does not
rerender the page introduction or navigation labels. Inactive scenes unmount.
The few imperative operations are browser boundaries: visibility observers,
clipboard, keyboard focus, tab-strip scrolling and the clock itself.

## Keeping edits independent

1. Change scene timing in its pure `*Frame` / `timeline` module and render that
   timestamp before changing the presentation. Do not add another timer.
2. Keep scene-specific spacing and overrides in that scene's CSS Module. Shared
   primitives define chrome and tokens, not a scene's absolute placement.
3. Update `config.js` when a duration or readable still changes.
4. Inspect desktop and compact layouts. Compact scenes reflow; they are not
   miniaturized copies of the desktop canvas. The outer shell reserves height
   across scene changes so the carousel does not shift the page.
5. Check forward playback, reverse seeking, reduced motion, and any direct
   controls affected by the change. Explicit seeks increment `revision` so a
   prior live-control override cannot leak into a new run.

## Product invariants

- Qwen, Gemma 4 and GLM 5.2 are alternative reasoning leads. Specialists retain
  independent contexts. A returned tool result goes back to its caller.
- Voice is Whisper → raw text → S1-mini cleanup → reasoning lead. S1-mini is
  not depicted as accepting an audio waveform.
- A projected image enters the reasoning model before forks. Newly admitted
  evidence is inherited only by later descendants of that lineage.
- Manual pause holds the current state. Cancel targets the existing selected
  child; history remains while surviving agents continue.
- Entropy and surprisal are generation signals, not factual confidence. The
  inspector uses captured display geometry from the DevTools film. Its reveal
  timing is editorial, not a replay of raw numerical telemetry.
- The macOS ship illustration assumes signing is configured. Model files are
  downloaded and verified at first launch. The fresh workspace has no report.
- Spreadsheet records are fictional; the sheet is a forthcoming template.

## Accessibility and lifecycle

Tabs support arrows, Home and End. Keyboard focus suspends automatic motion.
The active tab remains visible without scrolling the document. Hidden controls
are inert. Reduced-motion preferences select readable scene stills; scene
controls also select settled frames. Hidden tabs and an offscreen hero suspend
the frame loop without losing user playback intent. All listeners and observers
are cleaned up for React StrictMode remounts.

## Verification

```sh
npm run build
npx eslint src/showpiece src/homepage
node --test src/showpiece/playback/playbackStore.test.mjs \
  src/showpiece/scenes/live/liveFrame.test.js \
  src/showpiece/scenes/delivery/deliveryFrame.test.mjs
```

Development mode exposes `window.__showpiece` for deterministic screenshot and
interaction checks. Its `actions` are the same commands used by the controls.
This harness is removed from production builds.

Original model marks and font licenses are retained in
`public/assets/showpiece/`. The showpiece makes no microphone requests or model
calls. It is an interactive product illustration.
