import { agents } from './inspectData.js';

// One clock keeps every lane, fork and event on the same time axis.
export const elapsedAt = time => 16 + 72 * Math.min(1, Math.max(0, (time - 1) / 7));
export function getTimelineFrame(time) {
  const now = elapsedAt(time);
  return {
    now,
    lanes: agents.map(agent => ({
      ...agent,
      visible: now >= agent.start,
      duration: Math.max(0, Math.min(now, agent.end) - agent.start),
    })),
  };
}
