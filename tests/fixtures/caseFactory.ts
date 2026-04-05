import type { CasePackage } from '../../src/domain/types.js';

export function makeValidCase(): CasePackage {
  const chunks = [1, 2, 3, 4].map((chunkNum) => {
    const chunk_id = `chunk_${chunkNum}`;
    const node_ids = Array.from({ length: 5 }, (_, i) => `node_c${chunkNum}_${i + 1}`);
    return { chunk_id, summary: `Summary ${chunkNum}`, node_ids };
  });

  const nodes = chunks.flatMap((chunk, cidx) =>
    chunk.node_ids.map((node_id, nidx) => ({
      node_id,
      chunk_id: chunk.chunk_id,
      body: `Body ${node_id}`,
      location: `loc_${cidx + 1}`,
      choices: [
        {
          choice_id: `choice_${node_id}_next`,
          label: 'Next',
          target_node_id:
            nidx < 4
              ? chunk.node_ids[nidx + 1]
              : cidx < 3
                ? chunks[cidx + 1].node_ids[0]
                : chunk.node_ids[nidx],
        },
      ],
    }))
  );

  return {
    case_id: 'case_valid',
    start_node_id: 'node_c1_1',
    chunks,
    nodes,
    objectives: [
      {
        objective_id: 'obj_complete_training',
        description: 'Complete training minigame',
        completion_source: 'minigame_completion',
        source_ref: 'minigame_training',
      },
    ],
    flags: ['flag_ready', 'flag_training_success', 'flag_training_retry'],
    rewards: ['reward_badge'],
    minigames: ['minigame_training'],
    actions: [
      { action_id: 'action_launch_training', type: 'launch_minigame', args: { minigame_id: 'minigame_training' } },
      { action_id: 'action_reward', type: 'grant_reward', args: { reward_id: 'reward_badge' } },
      {
        action_id: 'action_set_training_flag',
        type: 'set_flag',
        args: { low_flag: 'flag_training_retry', high_flag: 'flag_training_success', flag_id: 'flag_training_retry' },
      },
      { action_id: 'action_currency', type: 'apply_currency_delta', args: { delta: 0 } },
      { action_id: 'action_log', type: 'emit_mission_log', args: { message: 'training complete' } },
    ],
    triggers: [
      {
        trigger_id: 'trigger_enter_start',
        type: 'on_node_enter',
        ref: 'node_c1_1',
        action_chain: ['action_launch_training'],
        priority: 10,
      },
    ],
    minigame_completions: [
      {
        minigame_id: 'minigame_training',
        action_chain: ['action_set_training_flag', 'action_currency', 'action_reward', 'action_log'],
        payload_mapping: {
          currency_delta: 'accuracy*10-latency+hydra*2',
          flag_by_accuracy: '>=0.8=>success',
        },
      },
    ],
    guardrails: ['violence_filter', 'self_harm_filter'],
  };
}
