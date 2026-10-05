import test from 'node:test';
import assert from 'node:assert/strict';
import { getLiveFrame, initialInteraction, liveInteractionReducer } from './liveFrame.js';

test('projection precedes forks; evidence belongs to the parent before children appear', () => {
  const projection = getLiveFrame(2.6);
  assert.equal(projection.projection, 1);
  assert.equal(projection.pathProgress.research01, 0);
  assert.equal(projection.pathProgress.research02, 0);
  const admitted = getLiveFrame(10.2);
  assert.equal(admitted.admission, 1);
  assert.equal(admitted.pathProgress.child01a, 0);
  assert.equal(admitted.pathProgress.child01b, 0);
  assert.equal(admitted.research02State, 'Continuing');
  assert.equal(getLiveFrame(12.5).childExists, true);
});

test('authored pause freezes every active token and cancel preserves branch history', () => {
  const firstPause = getLiveFrame(14.5);
  const laterPause = getLiveFrame(15.8);
  assert.deepEqual(firstPause.tokens, laterPause.tokens);
  const cancelled = getLiveFrame(16.8);
  assert.equal(cancelled.tokens.child01b.visible, false);
  assert.equal(cancelled.pathProgress.child01b, 1);
  assert.equal(cancelled.child01bState, 'Cancelled');
  const resumed = getLiveFrame(19.5);
  assert.equal(resumed.tokens.child01b.visible, false);
  assert.notEqual(resumed.tokens.research02.progress, cancelled.tokens.research02.progress);
});

test('manual controls anchor the current state and supersede future authored control beats', () => {
  const current = getLiveFrame(7.2);
  const paused = liveInteractionReducer(initialInteraction, {
    type: 'control', revision: 0, time: current.time, activeTime: current.activeTime,
    paused: true, cancelled: false, resumed: false,
  });
  const frame = getLiveFrame(7.2, paused, { revision: 0, playing: false });
  assert.equal(frame.time, 7.2);
  assert.equal(frame.paused, true);
  assert.equal(frame.childExists, false);
  assert.equal(frame.cancelAvailable, false);
  assert.deepEqual(frame.tokens, current.tokens);
  const externallyResumed = getLiveFrame(7.6, paused, { revision: 0, playing: true });
  assert.equal(externallyResumed.paused, false);
  assert.equal(externallyResumed.resumed, true);
  const passedAuthoredPause = getLiveFrame(17, paused, { revision: 0, playing: true });
  assert.equal(passedAuthoredPause.cancelled, false);
  assert.equal(passedAuthoredPause.paused, false);
});

test('an explicit seek invalidates manual overrides without changing the authored lineage', () => {
  const oldInteraction = liveInteractionReducer(initialInteraction, {
    type: 'control', revision: 4, time: 12.5, activeTime: 12.5,
    paused: false, cancelled: true, resumed: false,
  });
  assert.equal(getLiveFrame(13, oldInteraction, { revision: 4 }).cancelled, true);
  const replay = getLiveFrame(13, oldInteraction, { revision: 5 });
  assert.equal(replay.manual, false);
  assert.equal(replay.cancelled, false);
  assert.equal(replay.tokens.child01b.visible, true);
});
