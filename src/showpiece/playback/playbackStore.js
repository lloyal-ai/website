import { SCENES, sceneById } from '../config.js';

/** One browser clock; scene renderers are pure functions of its time. */
export function createPlaybackStore({ requestFrame, cancelFrame } = {}) {
  const request = requestFrame ?? ((callback) => requestAnimationFrame(callback));
  const cancel = cancelFrame ?? ((id) => cancelAnimationFrame(id));
  const frames = new Set();
  const controls = new Set();
  let time = 0;
  let frameId = null;
  let previousTimestamp = null;
  let mounted = false;
  let environment = { visible: true, inView: false };
  let snapshot = Object.freeze({ sceneId: 'compose', playing: true, running: false, reducedMotion: false, revision: 0, autoAdvance: true });

  const emitFrame = () => frames.forEach((listener) => listener());
  const update = (patch) => {
    const next = { ...snapshot, ...patch };
    next.running = mounted && next.playing && !next.reducedMotion && environment.visible && environment.inView;
    if (Object.keys(next).some((key) => next[key] !== snapshot[key])) {
      snapshot = Object.freeze(next);
      controls.forEach((listener) => listener());
    }
    schedule();
  };

  function tick(timestamp) {
    frameId = null;
    if (!snapshot.running) return;
    const elapsed = previousTimestamp === null ? 0 : Math.min((timestamp - previousTimestamp) / 1000, 0.1);
    previousTimestamp = timestamp;
    const scene = sceneById(snapshot.sceneId);
    time = Math.min(scene.duration, time + elapsed);
    emitFrame();
    if (time >= scene.duration) {
      if (snapshot.autoAdvance) {
        const next = SCENES[(SCENES.indexOf(scene) + 1) % SCENES.length];
        time = 0;
        update({ sceneId: next.id, revision: snapshot.revision + 1 });
        emitFrame();
      } else update({ playing: false });
    }
    schedule();
  }

  function schedule() {
    if (snapshot.running && frameId === null) frameId = request(tick);
    if (!snapshot.running) {
      if (frameId !== null) cancel(frameId);
      frameId = null;
      previousTimestamp = null;
    }
  }

  const actions = Object.freeze({
    play() {
      if (snapshot.reducedMotion) return;
      if (time >= sceneById(snapshot.sceneId).duration) {
        time = 0;
        update({ revision: snapshot.revision + 1 });
        emitFrame();
      }
      update({ playing: true });
    },
    pause() { update({ playing: false }); },
    seek(value) {
      const scene = sceneById(snapshot.sceneId);
      const target = Number(value);
      time = Number.isFinite(target) ? Math.max(0, Math.min(scene.duration, target)) : 0;
      previousTimestamp = null;
      update({ playing: false, revision: snapshot.revision + 1, autoAdvance: false });
      emitFrame();
    },
    restart() {
      time = snapshot.reducedMotion ? sceneById(snapshot.sceneId).still : 0;
      previousTimestamp = null;
      update({ playing: !snapshot.reducedMotion, revision: snapshot.revision + 1, autoAdvance: false });
      emitFrame();
    },
    selectScene(id, { autoplay = true, autoAdvance = false } = {}) {
      const scene = sceneById(id);
      time = snapshot.reducedMotion ? scene.still : 0;
      previousTimestamp = null;
      update({ sceneId: scene.id, playing: autoplay && !snapshot.reducedMotion, autoAdvance, revision: snapshot.revision + 1 });
      emitFrame();
    },
  });

  return Object.freeze({
    actions,
    getTime: () => time,
    getSnapshot: () => snapshot,
    subscribeTime: (listener) => { frames.add(listener); return () => frames.delete(listener); },
    subscribe: (listener) => { controls.add(listener); return () => controls.delete(listener); },
    setEnvironment(patch) { environment = { ...environment, ...patch }; update({}); },
    setReducedMotion(reducedMotion) {
      if (reducedMotion === snapshot.reducedMotion) return;
      if (reducedMotion) time = sceneById(snapshot.sceneId).still;
      update({ reducedMotion, playing: false, revision: snapshot.revision + 1 });
      emitFrame();
    },
    mount() { mounted = true; update({}); },
    unmount() { mounted = false; update({}); },
  });
}
