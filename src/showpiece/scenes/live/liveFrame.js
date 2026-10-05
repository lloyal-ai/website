import { progress, ease } from '../../motion/math.js';

// One deterministic scene clock drives the illustration. Direct manipulation
// records an anchor on that clock; it never jumps to a later storyboard beat.
export const LIVE_DURATION = 21.5;
export const LIVE_BEATS = Object.freeze({
  projection: 2.6,
  fork: 5.4,
  admission: 10.2,
  children: 12.15,
  pause: 14.25,
  cancel: 16.5,
  resume: 18.1,
});

const reveal = (time, start, end) => ease(progress(time, start, end));
const cycle = (time, start, period) => ((Math.max(0, time - start) / period) % 1);

export const initialInteraction = Object.freeze({ revision: -1, manual: false });

export function authoredActiveTime(time) {
  if (time < LIVE_BEATS.pause) return time;
  if (time < LIVE_BEATS.resume) return LIVE_BEATS.pause;
  return time - (LIVE_BEATS.resume - LIVE_BEATS.pause);
}

export function liveInteractionReducer(state, action) {
  if (action.type !== 'control') return state;
  const { revision, time, activeTime, paused, cancelled, resumed } = action;
  return {
    revision,
    manual: true,
    originTime: time,
    originActiveTime: activeTime,
    paused,
    cancelled,
    resumed,
  };
}

function footnoteFor({ time, paused, cancelled, manual, resumed }) {
  if (manual && paused) {
    return cancelled
      ? ['01b is cancelled.', 'The run stays paused; its history remains inspectable.']
      : ['Paused at the current state.', 'Resume to continue from here.'];
  }
  if (manual && cancelled) {
    return ['01b is cancelled.', 'Other agents continue; its history remains inspectable.'];
  }
  if (time < 3.5) return ['One image', 'enters the model before any agent forks.'];
  if (time < 8.3) return ['Same image-conditioned attention state.', 'Independent continuations.'];
  if (time < 10.6) return ['Tool evidence enters Research 01.', 'Research 02 is unchanged.'];
  if (manual || time < LIVE_BEATS.pause) {
    return ['01a and 01b inherit the image', 'and newly admitted evidence.'];
  }
  if (resumed) return ['01a and Research 02 resume.', 'Cancelled 01b stays stopped.'];
  if (cancelled) return ['01b is cancelled.', 'Its history remains inspectable.'];
  return ['Paused at a safe boundary.', 'Inspect before continuing.'];
}

export function getLiveFrame(time, interaction = initialInteraction, { revision = 0, playing = true } = {}) {
  const t = Math.max(0, Math.min(LIVE_DURATION, Number(time) || 0));
  // A seek/restart/new scene invalidates local interactions without an effect
  // that would introduce an extra render or replay stale controls.
  const manual = interaction.manual && interaction.revision === revision;
  const authoredPaused = t >= LIVE_BEATS.pause && t < LIVE_BEATS.resume;
  const paused = manual ? interaction.paused && !playing : authoredPaused;
  const cancelled = manual ? interaction.cancelled : t >= LIVE_BEATS.cancel;
  const activeTime = manual
    ? interaction.originActiveTime + Math.max(0, t - interaction.originTime)
    : authoredActiveTime(t);
  const resumed = manual
    ? interaction.resumed || (interaction.paused && playing)
    : t >= LIVE_BEATS.resume;
  const childExists = t >= LIVE_BEATS.children;
  const pathProgress = {
    prefix: reveal(t, 0.8, 3.1),
    research01: reveal(t, 3.5, 4.7),
    research02: reveal(t, 3.5, 5.05),
    child01a: reveal(t, 10.6, 11.8),
    child01b: reveal(t, 10.85, 12.15),
  };
  const tokens = {
    prefix: { progress: pathProgress.prefix, visible: t >= 0.8 && t < 3.2 },
    research01: {
      progress: t < 4.7 ? pathProgress.research01 : 0.53 + 0.45 * cycle(activeTime, 4.7, 2.7),
      visible: t >= 3.5 && t < 10.6,
    },
    research02: {
      progress: t < 5.05 ? pathProgress.research02 : 0.36 + 0.64 * cycle(activeTime, 5.05, 3.25),
      visible: t >= 3.5,
    },
    child01a: {
      progress: t < 11.8 ? pathProgress.child01a : 0.12 + 0.88 * cycle(activeTime, 11.8, 2.2),
      visible: t >= 10.6,
    },
    child01b: {
      progress: t < 12.15 ? pathProgress.child01b : 0.1 + 0.9 * cycle(activeTime, 12.15, 2.6),
      visible: t >= 10.85 && !cancelled,
    },
  };
  return {
    time: t,
    activeTime,
    manual,
    paused,
    cancelled,
    resumed,
    childExists,
    cancelAvailable: childExists && !cancelled,
    pathProgress,
    tokens,
    projection: reveal(t, 1.1, 2.2),
    prefixLabel: reveal(t, 1.9, 2.6),
    rootFork: reveal(t, 3.3, 3.7),
    childFork: reveal(t, 10.6, 11),
    research01Label: reveal(t, 3.55, 4.25),
    research02Label: reveal(t, 3.65, 4.35),
    child01aLabel: reveal(t, 11, 11.55),
    child01bLabel: reveal(t, 11.1, 11.75) * (cancelled ? 0.65 : 1),
    admission: reveal(t, 9.2, 9.85),
    toolReturn: {
      progress: reveal(t, 8.3, 9.6),
      opacity: t >= 8.3 && t < 9.6
        ? Math.min(progress(t, 8.3, 8.5), 1 - progress(t, 9.45, 9.6))
        : 0,
      label: reveal(t, 8.15, 8.4) * (1 - reveal(t, 9.3, 9.75)),
    },
    research01State: paused && t < 10.6 ? 'Paused'
      : t < 8.3 ? 'Continuing'
        : t < 9.85 ? 'Receiving evidence'
          : t < 10.6 ? 'Evidence admitted' : 'Parent state',
    research02State: paused ? 'Paused' : 'Continuing',
    child01bState: cancelled ? 'Cancelled' : paused ? 'Paused' : 'Continuing',
    runState: paused ? 'Paused'
      : t < 2.3 ? 'Image ready'
        : t < 3.5 ? 'Projecting image'
          : cancelled ? 'Survivors continuing' : 'Live inference',
    panelState: paused ? 'Paused' : t < 3.5 ? 'Preparing' : resumed ? 'Resumed' : 'Running',
    selectedAgent: childExists ? 'Research 01b' : 'Research 01',
    footnote: footnoteFor({ time: t, paused, cancelled, manual, resumed }),
  };
}
