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
