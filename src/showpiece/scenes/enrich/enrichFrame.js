import { progress } from '../../motion/math.js'

export const ENRICH_ROWS = Object.freeze([
  { id: '01', company: 'Northstar', sector: 'Developer tools', fit: 'Strong', signal: 'Hiring engineers', evidence: 'Engineering roles listed in the company profile.', source: 'company-profiles.pdf', completeAt: 4.6 },
  { id: '02', company: 'Meridian', sector: 'Infrastructure', fit: 'Strong', signal: 'New platform team', evidence: 'A new platform engineering team is described in the company profile.', source: 'company-profiles.pdf', completeAt: 7.1 },
  { id: '03', company: 'Arcwell', sector: 'Research', fit: 'Review', signal: 'Research expansion', evidence: 'The profile describes an expansion of the research group.', source: 'company-profiles.pdf', completeAt: 9.6 },
  { id: '04', company: 'Common Ground', sector: 'Services', fit: 'Review', signal: 'Evidence to review', evidence: 'The profile includes a new services initiative for review.', source: 'company-profiles.pdf', completeAt: 12.1 },
])

/** All visible state is a function of the shared playhead, including backward seeks. */
export function getEnrichFrame(time) {
  const completed = ENRICH_ROWS.filter(row => time >= row.completeAt).length
  const enriching = time >= 2.3 && completed < ENRICH_ROWS.length
  const selected = time >= 12.5 ? 0 : Math.min(completed, ENRICH_ROWS.length - 1)
  return {
    completed,
    enriching,
    selected,
    evidence: progress(time, 13.1, 13.65),
    cursor: progress(time, 0.5, 1.7),
    cursorVisible: time >= 0.5 && time < 2.7,
    pressed: time >= 1.8 && time < 2.08,
    signalProgress: enriching ? ((time - 2.3) % 1.9) / 1.9 : 1,
    rows: ENRICH_ROWS.map((row, index) => ({
      ...row,
      status: time >= row.completeAt ? 'complete' : enriching && completed === index ? 'reading' : 'queued',
      reveal: progress(time, row.completeAt, row.completeAt + 0.45),
    })),
  }
}
