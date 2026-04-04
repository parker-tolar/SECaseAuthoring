import { describe, expect, it } from 'vitest';
import { createInitialState, dispatchTrigger, resolveMinigameCompletion } from '../src/runtime/engine.js';
import { makeValidCase } from './fixtures/caseFactory.js';

describe('trigger dispatch and minigame completion', () => {
  it('dispatches launch trigger and completion action chain', () => {
    const pkg = makeValidCase();
    const state = createInitialState(pkg);

    dispatchTrigger(pkg, state, { type: 'on_node_enter', ref: 'node_c1_1' });
    expect(state.telemetry.some((t) => t.event === 'minigame_launched')).toBe(true);

    resolveMinigameCompletion(pkg, state, 'minigame_training', {
      accuracy: 0.9,
      latency: 2,
      hydra_influence: 1,
    });

    expect(state.rewards.has('reward_badge')).toBe(true);
    expect(state.flags.has('flag_training_success')).toBe(true);
    expect(state.currency).toBe(9);
  });
});
