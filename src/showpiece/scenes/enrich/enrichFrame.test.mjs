import test from 'node:test'
import assert from 'node:assert/strict'
import { ENRICH_ROWS, getEnrichFrame } from './enrichFrame.js'

test('each spreadsheet cell follows a tool request, independent scoring and returned evidence', () => {
  ENRICH_ROWS.forEach((row, index) => {
    const start = index === 0 ? 2.3 : ENRICH_ROWS[index - 1].completeAt
    const observedStages = []
    for (let time = start; time < row.completeAt; time += 0.01) {
      const frame = getEnrichFrame(time)
      const { stage } = frame.operation
      if (observedStages.at(-1) !== stage) observedStages.push(stage)
      assert.equal(frame.operation.rowId, row.id)
      assert.equal(frame.rows[index].status, 'reading')
      assert.equal(frame.completed, index)
      assert.equal(frame.rerankerActive, stage === 'scoring')
      assert.ok(Object.values(frame.routing).filter(route => route.active).length <= 1)
      if (stage === 'return') assert.equal(frame.operation.scoringProgress, 1)
      if (stage === 'output') {
        assert.equal(frame.routing.result.progress, 1)
        assert.equal(frame.rerankerActive, false)
        assert.equal(frame.leadActive, true)
      }
    }
    assert.deepEqual(observedStages, ['request', 'scoring', 'return', 'output'])
    const complete = getEnrichFrame(row.completeAt)
    assert.equal(complete.completed, index + 1)
    assert.equal(complete.rows[index].status, 'complete')
    assert.equal(complete.rows[index].reveal, 0)
  })
})

test('orchestration reconstructs on reverse seek and remains settled after the final cell', () => {
  const timestamps = [0, 2.3, 3.2, 4.25, 6.7, 8, 10.9, 12.1, 14]
  const frames = timestamps.map(getEnrichFrame)
  timestamps.toReversed().forEach((time, index) => {
    assert.deepEqual(getEnrichFrame(time), frames[frames.length - index - 1])
  })
  const before = getEnrichFrame(0)
  const after = getEnrichFrame(14)
  assert.equal(before.operation.stage, 'idle')
  assert.equal(after.operation.stage, 'complete')
  for (const frame of [before, after]) {
    assert.equal(frame.leadActive, false)
    assert.equal(frame.rerankerActive, false)
    assert.ok(Object.values(frame.routing).every(route => !route.active))
  }
  assert.ok(Object.values(after.routing).every(route => route.progress === 1))
  assert.equal(after.completed, ENRICH_ROWS.length)
})
