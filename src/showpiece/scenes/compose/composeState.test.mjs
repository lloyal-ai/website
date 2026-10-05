import test from 'node:test';
import assert from 'node:assert/strict';
import { availableLeadModels, composeReducer, initialState } from './composeState.js';

test('each composition keeps its own reasoning model when switching examples', () => {
  const voice = composeReducer(initialState, { type: 'select-lead', composition: 'voice', value: 'glm' });
  assert.deepEqual(voice.leads, { research: 'qwen', voice: 'glm', image: 'bonsai', enrich: 'glm' });
  const switched = composeReducer({ ...voice, leadMenuOpen: 'voice' }, { type: 'new-example' });
  assert.equal(switched.leadMenuOpen, null);
  assert.equal(switched.leads.voice, 'glm');
  assert.equal(switched.leads.research, 'qwen');
});

test('the multimodal example only accepts leads with a paired vision projector', () => {
  assert.deepEqual(availableLeadModels('image').map(([id]) => id), ['qwen', 'bonsai']);
  assert.equal(composeReducer(initialState, { type: 'select-lead', composition: 'image', value: 'glm' }), initialState);
  const swapped = composeReducer(initialState, { type: 'select-lead', composition: 'image', value: 'qwen' });
  assert.equal(swapped.leads.image, 'qwen');
  assert.equal(swapped.leads.enrich, 'glm');
});
