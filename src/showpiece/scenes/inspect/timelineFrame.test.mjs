import test from 'node:test';
import assert from 'node:assert/strict';
import { getTimelineFrame, elapsedAt } from './timelineFrame.js';

test('forks share their parent time axis and never generate before their fork', () => {
  for (let time = 0; time <= 9; time += .05) {
    const frame = getTimelineFrame(time);
    for (const lane of frame.lanes) {
      assert.ok(lane.duration >= 0 && lane.duration <= lane.end - lane.start);
      if (lane.parent) {
        const parent = frame.lanes.find(item => item.id === lane.parent);
        assert.ok(lane.start >= parent.start && lane.start <= parent.end);
        if (frame.now < lane.start) {
          assert.equal(lane.visible, false);
          assert.equal(lane.duration, 0);
        }
      }
    }
  }
  // Children branch only after the fetch event has entered their parent history.
  assert.ok(getTimelineFrame(8).lanes.find(lane => lane.id === '01a').start > elapsedAt(4.7));
});

test('time axis and final durations are deterministic when seeking backwards', () => {
  const early = getTimelineFrame(1.15);
  const late = getTimelineFrame(8);
  assert.equal(late.now, 88);
  assert.ok(late.lanes.every(lane => lane.duration === lane.end - lane.start));
  assert.deepEqual(getTimelineFrame(1.15), early);
  assert.equal(early.lanes.find(lane => lane.id === '01a').visible, false);
});
