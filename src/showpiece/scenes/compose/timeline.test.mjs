import test from 'node:test';
import assert from 'node:assert/strict';
import { COMPOSITIONS, compositionFrame } from './timeline.js';
import { SCENES } from '../../config.js';

test('templates are compositions, with Bonsai handling images and GLM handling spreadsheets', () => {
  assert.deepEqual(SCENES.map(scene => scene.id), ['compose', 'live', 'inspect', 'ship', 'launch']);
  assert.equal(COMPOSITIONS.find(example => example.id === 'image').model, 'bonsai');
  assert.equal(COMPOSITIONS.find(example => example.id === 'enrich').model, 'glm');
  for (const example of COMPOSITIONS) {
    const frame = compositionFrame(example.still);
    assert.equal(frame.active, example.id);
    assert.deepEqual(COMPOSITIONS.filter(item => frame[item.id].visible).map(item => item.id), [example.id]);
    assert.equal(frame[example.id].opacity, 1);
    assert.equal(frame[example.id].bodyY, 0);
    assert.equal(frame[example.id].time, example.still - example.start);
  }
  assert.ok(SCENES[0].duration > COMPOSITIONS.at(-1).still);
});

test('each transition carries the outgoing app away before settling the next, including reverse seeks', () => {
  for (let index = 1; index < COMPOSITIONS.length; index++) {
    const current = COMPOSITIONS[index], previous = COMPOSITIONS[index - 1];
    const entering = compositionFrame(current.start);
    assert.equal(entering[previous.id].bodyY, 0);
    assert.equal(entering[current.id].bodyY, 470);
    const mid = compositionFrame(current.start + .35);
    assert.ok(mid[previous.id].visible && mid[current.id].visible);
    assert.ok(mid[previous.id].bodyY < 0 && mid[current.id].bodyY > 0);
    const end = compositionFrame(current.start + .75);
    assert.equal(end[previous.id].visible, false);
    assert.equal(end[current.id].bodyY, 0);
    assert.deepEqual(compositionFrame(current.start), entering);
  }
});
