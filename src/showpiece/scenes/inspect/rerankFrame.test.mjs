import test from 'node:test';
import assert from 'node:assert/strict';
import { getRerankFrame } from './rerankFrame.js';
import { passages, rankedPassageIds } from './inspectData.js';

const orderAt = time => [...getRerankFrame(time).rows].sort((a, b) => a.position - b.position).map(row => row.id);

test('reranking promotes one source at a time and preserves all five identities', () => {
  assert.deepEqual(orderAt(12.1), ['01', '02', '03', '04', '05']);
  assert.deepEqual(orderAt(13.1), ['05', '01', '02', '03', '04']);
  assert.deepEqual(orderAt(13.95), ['05', '03', '01', '02', '04']);
  assert.deepEqual(orderAt(14.6), rankedPassageIds);
  for (let time = 12.1; time <= 14.6; time += .01) {
    const frame = getRerankFrame(time);
    assert.deepEqual(frame.rows.map(row => row.id), passages.map(passage => passage.id));
    assert.ok(frame.rows.filter(row => row.moving).length <= 1);
    assert.ok(frame.rows.every(row => row.position >= 0 && row.position <= 4));
    // Only the lifted foreground card crosses rows. Every other row keeps a
    // full line of clearance, so there is never a multi-card collision.
    const others = frame.rows.filter(row => !row.moving).sort((a, b) => a.position - b.position);
    others.slice(1).forEach((row, index) => assert.ok(row.position - others[index].position >= 1 - 1e-10));
  }
});

test('source lifts before travelling and settles before admission becomes available', () => {
  const lifted = getRerankFrame(12.2).rows.find(row => row.id === '05');
  assert.equal(lifted.position, 4);
  assert.ok(lifted.x > 0);
  assert.equal(getRerankFrame(14.59).complete, false);
  const settled = getRerankFrame(14.6);
  assert.equal(settled.complete, true);
  assert.ok(settled.rows.every(row => row.x === 0 && !row.moving && row.rank === row.position + 1));
});

test('seeking backwards reconstructs exact ranks and motion without accumulated state', () => {
  const samples = [11, 12.55, 13.5, 14.3, 16.9].map(getRerankFrame);
  [...samples].reverse().forEach((frame, index) => assert.deepEqual(getRerankFrame([16.9, 14.3, 13.5, 12.55, 11][index]), frame));
  assert.deepEqual(orderAt(16.9), rankedPassageIds);
  assert.deepEqual(orderAt(11), passages.map(passage => passage.id));
});
