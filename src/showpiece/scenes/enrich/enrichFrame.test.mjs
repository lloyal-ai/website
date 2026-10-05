import test from 'node:test'
import assert from 'node:assert/strict'
import { getEnrichFrame } from './enrichFrame.js'

test('a contiguous three-cell range is selected before the button starts parallel row agents', () => {
  assert.deepEqual(getEnrichFrame(0).selectedRows, [])
  assert.deepEqual(getEnrichFrame(1.2).selectedRows, [0])
  assert.deepEqual(getEnrichFrame(1.3).selectedRows, [0, 1])
  assert.equal(getEnrichFrame(1.3).cursorCue.progress, .25)
  assert.deepEqual(getEnrichFrame(1.6).selectedRows, [0, 1])
  assert.deepEqual(getEnrichFrame(1.7).selectedRows, [0, 1, 2])
  assert.ok(Math.abs(getEnrichFrame(1.7).cursorCue.progress - .75) < .0001)
  assert.deepEqual(getEnrichFrame(2).selectedRows, [0, 1, 2])
  const drag = getEnrichFrame(1.6)
  assert.equal(drag.pressed, true)
  assert.equal(drag.buttonPressed, false)
  assert.equal(drag.cursorCue.from, 'cell-0')
  assert.equal(drag.cursorCue.to, 'cell-2')
  const click = getEnrichFrame(2.95)
  assert.equal(click.cursorCue.to, 'enrich')
  assert.equal(click.cursorCue.progress, 1)
  assert.equal(click.buttonPressed, true)
  assert.equal(click.selectionPhase, 'selected')
  assert.ok(click.rows.every(row => row.status === 'idle'))
  const started = getEnrichFrame(3.3)
  assert.equal(started.selectionPhase, 'running')
  assert.deepEqual(started.rows.map(row => row.status), ['researching', 'researching', 'researching', 'idle'])
  assert.equal(started.totalSelected, 3)
})

test('all selected agents receive scored evidence before independently synthesizing their cells', () => {
  const expectedStages = [[3.4, 'request'], [4.5, 'scoring'], [6.2, 'return'], [6.5, 'output']]
  expectedStages.forEach(([time, stage]) => {
    const frame = getEnrichFrame(time)
    assert.equal(frame.operation.stage, stage)
    assert.deepEqual(frame.operation.rowIds, ['01', '02', '03'])
    assert.equal(frame.rerankerActive, stage === 'scoring')
    if (stage === 'return') assert.equal(frame.operation.scoringProgress, 1)
    if (stage === 'output') assert.equal(frame.routing.result.progress, 1)
  })
  assert.deepEqual(getEnrichFrame(6.4).rows.slice(0, 3).map(row => row.status), ['researching', 'researching', 'researching'])
  assert.deepEqual(getEnrichFrame(7).rows.slice(0, 3).map(row => row.status), ['synthesizing', 'researching', 'researching'])
  assert.deepEqual(getEnrichFrame(7.5).rows.slice(0, 3).map(row => row.status), ['synthesizing', 'synthesizing', 'researching'])
  assert.deepEqual(getEnrichFrame(8.7).rows.slice(0, 3).map(row => row.status), ['enriched', 'synthesizing', 'synthesizing'])
  assert.deepEqual(getEnrichFrame(9.7).rows.slice(0, 3).map(row => row.status), ['complete', 'enriched', 'synthesizing'])
})

test('each selected row finishes its status sequence before revealing a sourced summary; the unselected row never changes', () => {
  const seen = Array.from({ length: 3 }, () => [])
  for (let step = 0; step <= 1500; step += 1) {
    const frame = getEnrichFrame(step / 100)
    frame.rows.slice(0, 3).forEach((row, index) => {
      if (seen[index].at(-1) !== row.status) seen[index].push(row.status)
      if (row.status !== 'complete') assert.equal(row.reveal, 0)
    })
    assert.deepEqual(frame.rows[3], getEnrichFrame(0).rows[3])
    assert.ok(frame.completed <= 3)
  }
  seen.forEach(statuses => assert.deepEqual(statuses, ['idle', 'researching', 'synthesizing', 'enriched', 'complete']))
  const settled = getEnrichFrame(15)
  assert.equal(settled.completed, 3)
  assert.equal(settled.selectionPhase, 'complete')
  assert.equal(settled.enriching, false)
  assert.ok(settled.rows.slice(0, 3).every(row => row.summary && row.evidence && row.reveal === 1))
  assert.equal(settled.evidence, 1)
  assert.equal(settled.selected, 0)
})

test('reverse seeks reconstruct selection, row status, spinners, routing and completed results without stale state', () => {
  const timestamps = [0, 1.6, 2.95, 3.3, 4.5, 6.2, 7, 8.7, 9.7, 11.15, 15]
  const frames = timestamps.map(getEnrichFrame)
  timestamps.toReversed().forEach((time, index) => {
    assert.deepEqual(getEnrichFrame(time), frames[frames.length - index - 1])
  })
  assert.notEqual(getEnrichFrame(4.5).rows[0].spinnerAngle, getEnrichFrame(4.6).rows[0].spinnerAngle)
  for (const time of [0, 15]) {
    const frame = getEnrichFrame(time)
    assert.equal(frame.leadActive, false)
    assert.equal(frame.rerankerActive, false)
    assert.ok(Object.values(frame.routing).every(route => !route.active))
    assert.ok(frame.rows.every(row => row.spinnerAngle === 0))
  }
  assert.ok(Object.values(getEnrichFrame(15).routing).every(route => route.progress === 1))
})
