import { ease, progress, lerp } from '../../motion/math.js';

export const COMPOSITIONS = [
  { id: 'research', model: 'qwen', name: 'Qwen', purpose: 'retrieval', start: 0, still: 16 },
  { id: 'voice', model: 'gemma', name: 'Gemma 4', purpose: 'voice', start: 18.5, still: 31.2 },
  { id: 'image', model: 'bonsai', name: 'Bonsai', purpose: 'media store', start: 34.5, still: 48 },
  { id: 'enrich', model: 'glm', name: 'GLM 5.2', purpose: 'spreadsheet', start: 50, still: 65 },
];
export const RESEARCH_QUESTION = 'Compare these notes with the brief.';
export const RAW_TRANSCRIPT = 'Umm, compare these notes, ah, with the brief.';
export const IMAGE_QUESTION = 'Make this cover feel like sunrise.';
export const within = (time, start, end) => time >= start && time < end;
export const tween = (time, start, end) => ease(progress(time, start, end));
export const typeText = (value, time, start, end) => value.slice(0, Math.floor(value.length * progress(time, start, end)));

export function cursorPosition(time, stops) {
  let from = stops[0];
  let to = stops.at(-1);
  for (let index = 1; index < stops.length; index += 1) {
    if (time <= stops[index][0]) {
      from = stops[index - 1];
      to = stops[index];
      break;
    }
  }
  const amount = tween(time, from[0], to[0]);
  return { x: lerp(from[1], to[1], amount), y: lerp(from[2], to[2], amount) };
}

/** All motion is a pure projection of scene time. Scrubbing has no side effects. */
export function compositionFrame(time) {
  const active = COMPOSITIONS.findLast(composition => time >= composition.start) ?? COMPOSITIONS[0];
  const phases = Object.fromEntries(COMPOSITIONS.map((composition, index) => {
    const start = composition.start;
    const end = COMPOSITIONS[index + 1]?.start ?? Infinity;
    const entering = index === 0 ? 1 : tween(time, start, start + .75);
    const leaving = Number.isFinite(end) ? tween(time, end, end + .75) : 0;
    const opacityIn = index === 0 ? 1 : tween(time, start + .33, start + .75);
    const opacityOut = Number.isFinite(end) ? 1 - tween(time, end, end + .37) : 1;
    return [composition.id, {
      time: Math.max(0, time - start),
      visible: time >= start && time < end + .75,
      opacity: opacityIn * opacityOut,
      railY: 120 * (1 - entering) - 120 * leaving,
      bodyY: 470 * (1 - entering) - 470 * leaving,
    }];
  }));
  return { time, active: active.id, ...phases };
}

export function researchFrame(time) {
  const leadActive = within(time, 5.65, 6.4) || within(time, 10.38, 11.8);
  return {
    leadActive,
    rankActive: within(time, 7.08, 9.55),
    leadStatus: time < 4.8 ? 'Ready' : time < 5.65 ? 'Receiving' : time < 6.32 ? 'Choosing a tool' : time < 10.38 ? 'Awaiting evidence' : time < 11.8 ? 'Continuing' : 'Ready',
    state: time < 4.8 ? 'Settled' : time < 10.4 ? 'Finding sources' : time < 13.5 ? 'Updating' : 'Settled',
    busy: within(time, 4.8, 13.5),
    attachment: tween(time, 1.45, 1.9) * (1 - tween(time, 12.9, 13.5)),
    tool: tween(time, 6.05, 6.4) * (1 - 0.55 * tween(time, 10.4, 11.1)),
    ranked: tween(time, 8.25, 9.05),
    reportY: -98 * tween(time, 12.1, 13.2),
    evidence: tween(time, 11.95, 12.65),
    notice: tween(time, 13.1, 13.5) * (1 - tween(time, 15.8, 16.3)),
  };
}

export function voiceFrame(time) {
  const recording = within(time, 2.2, 6.65);
  return {
    recording,
    transcribing: within(time, 2.65, 7.6),
    cleaning: within(time, 8, 9.25),
    leadActive: within(time, 10, 11.6),
    answer: tween(time, 12, 12.7),
    leadStatus: time < 10 ? 'Ready for a request' : time < 11.6 ? 'Working with the brief' : 'Ready',
    state: recording ? 'Listening' : within(time, 6.65, 7.6) ? 'Transcribing' : within(time, 7.6, 10) ? 'Cleaning transcript' : within(time, 10, 12) ? 'Updating brief' : time >= 12 ? 'Settled' : 'Ready',
    recordingLabel: recording ? 'Recording locally' : time >= 12 ? 'Ask another question' : time >= 9.25 ? 'Ready for the lead' : time >= 6.65 ? 'Recording complete' : 'Click to speak',
  };
}

export function imageFrame(time) {
  return {
    leadActive: within(time, 4, 5.4) || within(time, 10.85, 11.85),
    working: within(time, 6.1, 9.7),
    busy: within(time, 3.2, 12.2),
    updated: tween(time, 12.2, 12.9),
    leadStatus: time < 4 ? 'Ready for a request' : time < 5.4 ? 'Choosing an image tool' : time < 10.85 ? 'Awaiting tool result' : time < 11.85 ? 'Continuing' : 'Ready',
    state: time < 3.2 ? 'Ready' : time < 5.4 ? 'Choosing a tool' : time < 10.85 ? 'Editing cover' : time < 12.2 ? 'Updating wiki' : 'Settled',
  };
}
