import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlaybackStore } from './playbackStore.js';

function harness() {
  let callback = null;
  let timestamp = 0;
  const store = createPlaybackStore({ requestFrame: (next) => { callback = next; return 1; }, cancelFrame: () => { callback = null; } });
  const advance = (seconds) => {
    for (let i = 0; i < seconds * 100; i += 1) {
      timestamp += 10;
      const next = callback;
      callback = null;
      next?.(timestamp);
    }
  };
  store.mount();
  store.setEnvironment({ inView: true });
  return { store, advance, hasScheduledFrame: () => callback !== null };
}

test('pause and offscreen suspension hold the actual frame, without catch-up on resume', () => {
  const { store, advance, hasScheduledFrame } = harness();
  advance(1);
  const before = store.getTime();
  store.actions.pause();
  advance(30);
  assert.equal(store.getTime(), before);
  assert.equal(hasScheduledFrame(), false);
  store.actions.play();
  advance(0.1);
  assert.ok(store.getTime() < before + 0.11);
  store.setEnvironment({ inView: false });
  const offscreen = store.getTime();
  advance(100);
  assert.equal(store.getTime(), offscreen);
  assert.equal(store.getSnapshot().playing, true);
  assert.equal(store.getSnapshot().running, false);
  store.setEnvironment({ inView: true });
  advance(0.1);
  assert.ok(store.getTime() < offscreen + 0.11);
});

test('seeking resets interaction revision and keeps manual scene selection at its end', () => {
  const { store, advance } = harness();
  store.actions.selectScene('live');
  store.actions.seek(5.4);
  const revision = store.getSnapshot().revision;
  assert.equal(store.getTime(), 5.4);
  assert.equal(store.getSnapshot().playing, false);
  store.actions.play();
  advance(30);
  assert.equal(store.getSnapshot().sceneId, 'live');
  assert.equal(store.getTime(), 21.5);
  assert.equal(store.getSnapshot().playing, false);
  store.actions.restart();
  assert.ok(store.getSnapshot().revision > revision);
  assert.equal(store.getTime(), 0);
});

test('reduced motion displays readable stills and never starts a frame loop', () => {
  const { store, advance, hasScheduledFrame } = harness();
  store.setReducedMotion(true);
  assert.equal(store.getTime(), 16);
  store.actions.play();
  advance(10);
  assert.equal(store.getTime(), 16);
  store.actions.selectScene('inspect');
  assert.equal(store.getTime(), 18);
  assert.equal(hasScheduledFrame(), false);
  store.unmount();
});

test('frame updates do not notify control subscribers, and auto advance is ordered', () => {
  const { store, advance } = harness();
  let notifications = 0;
  store.subscribe(() => notifications += 1);
  advance(1);
  assert.equal(notifications, 0);
  advance(49.2);
  assert.equal(store.getSnapshot().sceneId, 'live');
  assert.equal(notifications, 1);
  store.unmount();
});
