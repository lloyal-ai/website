import { progress } from '../../motion/math.js'

export const ENRICH_ROWS = Object.freeze([
  { id: '01', company: 'Northstar', sector: 'Developer tools', fit: 'Strong', summary: 'Hiring engineers', evidence: 'Engineering roles listed in the company profile.', source: 'company-profiles.pdf' },
  { id: '02', company: 'Meridian', sector: 'Infrastructure', fit: 'Strong', summary: 'New platform team', evidence: 'A new platform engineering team is described in the company profile.', source: 'company-profiles.pdf' },
  { id: '03', company: 'Arcwell', sector: 'Research', fit: 'Review', summary: 'Expanding research', evidence: 'The profile describes an expansion of the research group.', source: 'company-profiles.pdf' },
  { id: '04', company: 'Common Ground', sector: 'Services', fit: 'Review', summary: '', evidence: 'The profile includes a new services initiative for review.', source: 'company-profiles.pdf' },
])

// One range selection dispatches parallel row agents. The reranker scores their
// candidate evidence in its own context before the agents synthesize each cell.
const ROW_SCHEDULE = Object.freeze([
  { selectedAt: 1.1, synthesizeAt: 6.5, enrichedAt: 8.5, completeAt: 9.15 },
  { selectedAt: 1.3, synthesizeAt: 7.25, enrichedAt: 9.5, completeAt: 10.15 },
  { selectedAt: 1.7, synthesizeAt: 8, enrichedAt: 10.5, completeAt: 11.15 },
])
const ENRICH_START = 3.3
const REQUEST_END = 4.1
const SCORING_END = 5.9
const EVIDENCE_RETURNED = 6.5
const ENRICH_END = ROW_SCHEDULE.at(-1).completeAt

function getOrchestration(time, completed) {
  const stage = time < ENRICH_START ? 'idle'
    : time < REQUEST_END ? 'request'
      : time < SCORING_END ? 'scoring'
        : time < EVIDENCE_RETURNED ? 'return'
          : time < ENRICH_END ? 'output' : 'complete'
  const route = (name, from, to) => ({ active: stage === name, progress: progress(time, from, to) })
  const statuses = {
    idle: 'Ready to enrich rows',
    request: 'Researching rows',
    scoring: 'Awaiting row evidence',
    return: 'Row evidence returning',
    output: 'Synthesizing rows',
    complete: 'Rows enriched',
  }

  return {
    operation: {
      stage,
      rowId: ENRICH_ROWS[Math.min(completed, ROW_SCHEDULE.length - 1)].id,
      rowIds: ENRICH_ROWS.slice(0, ROW_SCHEDULE.length).map(row => row.id),
      progress: progress(time, ENRICH_START, ENRICH_END),
      scoringProgress: progress(time, REQUEST_END, SCORING_END),
    },
    routing: {
      request: route('request', ENRICH_START, REQUEST_END),
      result: route('return', SCORING_END, EVIDENCE_RETURNED),
      output: route('output', EVIDENCE_RETURNED, ENRICH_END),
    },
    leadActive: ['request', 'return', 'output'].includes(stage),
    rerankerActive: stage === 'scoring',
    leadStatus: statuses[stage],
  }
}

function getCursorCue(time) {
  if (time < 1.1) return { from: 'entry', to: 'cell-0', progress: progress(time, 0.5, 1.1) }
  if (time < 2.05) return { from: 'cell-0', to: 'cell-2', progress: progress(time, 1.1, 1.9) }
  return { from: 'cell-2', to: 'enrich', progress: progress(time, 2.05, 2.8) }
}

function getRowStatus(time, schedule) {
  if (!schedule || time < ENRICH_START) return 'idle'
  if (time < schedule.synthesizeAt) return 'researching'
  if (time < schedule.enrichedAt) return 'synthesizing'
  if (time < schedule.completeAt) return 'enriched'
  return 'complete'
}

/** All visible state is a function of the shared playhead, including backward seeks. */
export function getEnrichFrame(time) {
  const completed = ROW_SCHEDULE.filter(row => time >= row.completeAt).length
  const selectedRows = ROW_SCHEDULE.flatMap((row, index) => time >= row.selectedAt ? [index] : [])
  const enriching = time >= ENRICH_START && time < ENRICH_END
  const selectionPhase = time < ROW_SCHEDULE[0].selectedAt ? 'idle'
    : time < ROW_SCHEDULE.at(-1).selectedAt ? 'selecting'
      : time < ENRICH_START ? 'selected'
        : enriching ? 'running' : 'complete'
  const buttonPressed = time >= 2.85 && time < 3.1

  return {
    ...getOrchestration(time, completed),
    completed,
    enriching,
    selected: time >= 12.5 ? 0 : Math.max(0, completed - 1),
    selectedRows,
    selectionPhase,
    totalSelected: ROW_SCHEDULE.length,
    evidence: progress(time, 13.1, 13.65),
    cursorCue: getCursorCue(time),
    cursorVisible: time >= 0.5 && time < 3.4,
    pressed: (time >= 1.1 && time < 1.9) || buttonPressed,
    buttonPressed,
    rows: ENRICH_ROWS.map((row, index) => {
      const schedule = ROW_SCHEDULE[index]
      const status = getRowStatus(time, schedule)
      return {
        ...row,
        selected: selectedRows.includes(index),
        status,
        spinnerAngle: ['researching', 'synthesizing'].includes(status) ? ((time - ENRICH_START) * 300 + index * 30) % 360 : 0,
        reveal: schedule ? progress(time, schedule.completeAt, schedule.completeAt + 0.45) : 0,
      }
    }),
  }
}
