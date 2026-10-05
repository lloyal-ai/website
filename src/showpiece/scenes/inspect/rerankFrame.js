import { ease, lerp, progress } from '../../motion/math.js';
import { passages } from './inspectData.js';

export const RERANK_START = 12.1;
export const RERANK_END = 14.6;

// One insertion at a time: lift the source, open its new slot, then settle it.
// The first, most important promotion gets a full second; the final move is one row.
const moves = [
  { id: '05', to: 0, start: RERANK_START, end: 13.1 },
  { id: '03', to: 1, start: 13.15, end: 13.95 },
  { id: '04', to: 3, start: 14, end: RERANK_END },
];

function inserted(order, id, to) {
  const next = order.filter(source => source !== id);
  next.splice(to, 0, id);
  return next;
}

/** A seekable projection of source identities into rank slots; no accumulated state. */
export function getRerankFrame(time) {
  let order = passages.map(passage => passage.id);
  let active;
  for (const move of moves) {
    if (time >= move.end) order = inserted(order, move.id, move.to);
    else if (time > move.start) { active = move; break; }
    else break;
  }

  const target = active ? inserted(order, active.id, active.to) : order;
  const duration = active ? active.end - active.start : 1;
  const travel = active ? ease(progress(time, active.start + duration * .2, active.end - duration * .18)) : 0;
  const lift = active ? Math.min(
    ease(progress(time, active.start, active.start + duration * .2)),
    1 - ease(progress(time, active.end - duration * .18, active.end)),
  ) : 0;

  return {
    complete: time >= RERANK_END,
    activeId: active?.id ?? null,
    token: active ? progress(time, active.start, active.end) : 0,
    rows: passages.map(passage => {
      const from = order.indexOf(passage.id);
      const to = target.indexOf(passage.id);
      const moving = active?.id === passage.id;
      return {
        id: passage.id,
        position: lerp(from, to, travel),
        rank: (travel === 1 ? to : from) + 1,
        x: moving ? 8 * lift : 0,
        lift: moving ? lift : 0,
        moving,
      };
    }),
  };
}
