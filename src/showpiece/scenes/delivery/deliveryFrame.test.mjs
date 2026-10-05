import test from 'node:test'
import assert from 'node:assert/strict'
import { getShipFrame, getLaunchFrame, SHIP_COMMAND } from './deliveryFrame.js'

test('a signed, notarized artifact cannot precede the required shipping steps', () => {
  for (let time = 0; time <= 18; time += 0.1) {
    const frame = getShipFrame(time)
    frame.steps.forEach((step, index) => {
      if (step.status !== 'queued') {
        assert.ok(frame.steps.slice(0, index).every(previous => previous.status === 'complete'))
        assert.equal(frame.command, SHIP_COMMAND)
      }
    })
    if (frame.output > 0 || frame.artifact > 0) assert.ok(frame.steps.every(step => step.status === 'complete'))
  }
})

test('created output leads the shell shift, followed by the artifact after 120ms', () => {
  const waiting = getShipFrame(14.05)
  assert.equal(waiting.output, 0)
  assert.equal(waiting.terminalShift, 0)
  assert.equal(waiting.artifact, 0)
  assert.equal(waiting.artifactOpacity, 0)

  const shellMoving = getShipFrame(14.11)
  assert.ok(shellMoving.output > 0)
  assert.ok(shellMoving.terminalShift > 0)
  assert.equal(shellMoving.artifact, 0)
  assert.equal(shellMoving.artifactOpacity, 0)
  assert.equal(getShipFrame(14.17).artifact, 0)

  const emerging = getShipFrame(14.3)
  assert.ok(emerging.artifact > 0 && emerging.artifact < 1)
  assert.ok(emerging.artifactOpacity > 0 && emerging.artifactOpacity < 1)
  assert.equal(emerging.artifactDetails, 0)
  assert.equal(getShipFrame(14.85).terminalShift, 1)
  assert.ok(getShipFrame(14.85).artifact < 1)
  assert.equal(getShipFrame(14.97).artifact, 1)
  assert.equal(getShipFrame(15.18).artifactDetails, 1)
})

test('artifact motion decelerates without overshoot and reverse seeking restores the composition', () => {
  for (const [key, start] of [['terminalShift', 14.05], ['artifact', 14.17]]) {
    const samples = [0, 0.2, 0.4, 0.6, 0.8].map(offset => getShipFrame(start + offset)[key])
    const distances = samples.slice(1).map((value, index) => value - samples[index])
    assert.ok(samples.every(value => value >= 0 && value <= 1))
    assert.ok(distances.every(distance => distance > 0))
    assert.ok(distances.slice(1).every((distance, index) => distance < distances[index]))
  }
  const start = getShipFrame(10)
  const partial = getShipFrame(14.4)
  const settled = getShipFrame(16)
  for (const key of ['output', 'terminalShift', 'artifact', 'artifactOpacity', 'artifactDetails']) assert.equal(settled[key], 1)
  assert.deepEqual(getShipFrame(14.4), partial)
  assert.deepEqual(getShipFrame(10), start)
  assert.equal(start.terminalShift, 0)
  assert.equal(start.artifactOpacity, 0)
})

test('provisioning verifies each model before the next and opens only a verified workspace', () => {
  for (let time = 0; time <= 22; time += 0.1) {
    const frame = getLaunchFrame(time)
    frame.models.forEach((model, index) => {
      if (model.status !== 'waiting') {
        assert.equal(frame.machine, 'ready')
        assert.ok(frame.models.slice(0, index).every(previous => previous.status === 'verified'))
      }
      if (model.status === 'verifying' || model.status === 'verified') assert.equal(model.progress, 1)
    })
    if (frame.workspace > 0) assert.ok(frame.allVerified)
  }
})
