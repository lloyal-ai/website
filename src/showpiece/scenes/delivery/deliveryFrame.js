import { progress } from '../../motion/math.js'

export const SHIP_COMMAND = 'npx lloyal-ai ship --notarize'
export const SHIP_STEPS = Object.freeze([
  { id: 'build', label: 'Build', detail: 'macOS application', start: 3.4, end: 6.0 },
  { id: 'sign', label: 'Sign', detail: 'Developer ID', start: 6.2, end: 8.4 },
  { id: 'notarize', label: 'Notarize', detail: 'Apple notarization', completeDetail: 'ticket accepted', start: 8.6, end: 11.8 },
  { id: 'staple', label: 'Staple', detail: 'application + disk image', completeDetail: 'ticket attached', start: 12.0, end: 13.8 },
])

// A created file opens the composition: shell first, then its output 120ms later.
// Pure easing keeps pause, reverse seeks and the reduced-motion still identical.
const easeOut = amount => 1 - (1 - amount) ** 3

export function getShipFrame(time) {
  return {
    command: SHIP_COMMAND.slice(0, Math.floor(SHIP_COMMAND.length * progress(time, 0.7, 2.8))),
    typing: time < 3.0,
    caret: time < 3.0 && Math.floor(time * 2.5) % 2 === 0,
    steps: SHIP_STEPS.map(step => ({ ...step, status: time >= step.end ? 'complete' : time >= step.start ? 'active' : 'queued', progress: progress(time, step.start, step.end) })),
    output: progress(time, 14.05, 14.5),
    terminalShift: easeOut(progress(time, 14.05, 14.85)),
    artifact: easeOut(progress(time, 14.17, 14.97)),
    artifactOpacity: progress(time, 14.17, 14.41),
    artifactDetails: progress(time, 14.82, 15.18),
  }
}

export const PROVISION_MODELS = Object.freeze([
  { id: 'reasoning', name: 'Qwen3.5 4B', role: 'Reasoning model', icon: 'panel', start: 3.0, downloadEnd: 6.3, verifiedAt: 7.25 },
  { id: 'reranker', name: 'Qwen3 Reranker 0.6B', role: 'Retrieval specialist', icon: 'search', start: 7.5, downloadEnd: 10.65, verifiedAt: 11.6 },
  { id: 'projector', name: 'Vision projector', role: 'Paired with the reasoning model', icon: 'projector', start: 11.85, downloadEnd: 14.7, verifiedAt: 15.65 },
])

export function getLaunchFrame(time) {
  const models = PROVISION_MODELS.map(model => ({
    ...model,
    status: time >= model.verifiedAt ? 'verified' : time >= model.downloadEnd ? 'verifying' : time >= model.start ? 'downloading' : 'waiting',
    progress: progress(time, model.start, model.downloadEnd),
  }))
  return {
    machine: time >= 2.7 ? 'ready' : time >= 0.6 ? 'checking' : 'waiting',
    machineProgress: progress(time, 0.6, 2.7),
    models,
    allVerified: models.every(model => model.status === 'verified'),
    ready: progress(time, 16.1, 16.6),
    workspace: progress(time, 17.1, 17.75),
    caret: time >= 18.3 && Math.floor(time * 2) % 2 === 0,
  }
}
