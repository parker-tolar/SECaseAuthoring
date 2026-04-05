import { z } from 'zod';

export const TriggerTypeSchema = z.enum([
  'on_choice_selected',
  'on_node_enter',
  'on_flag_present'
]);

export const ActionTypeSchema = z.enum([
  'launch_minigame',
  'grant_reward',
  'set_flag',
  'apply_currency_delta',
  'goto_node',
  'open_reflection_prompt',
  'emit_mission_log'
]);

export const CompletionSourceSchema = z.enum(['flag', 'reward', 'minigame_completion']);

export const ChoiceSchema = z.object({
  choice_id: z.string().regex(/^choice_[a-z0-9_]+$/),
  label: z.string().min(1),
  target_node_id: z.string().regex(/^node_[a-z0-9_]+$/)
});

export const NodeSchema = z.object({
  node_id: z.string().regex(/^node_[a-z0-9_]+$/),
  chunk_id: z.string().regex(/^chunk_[1-4]$/),
  body: z.string().min(1),
  choices: z.array(ChoiceSchema),
  location: z.string().optional()
});

export const ObjectiveSchema = z.object({
  objective_id: z.string().regex(/^obj_[a-z0-9_]+$/),
  description: z.string().min(1),
  completion_source: CompletionSourceSchema,
  source_ref: z.string().min(1)
});

export const TriggerSchema = z.object({
  trigger_id: z.string().regex(/^trigger_[a-z0-9_]+$/),
  type: TriggerTypeSchema,
  ref: z.string().min(1),
  action_chain: z.array(z.string().regex(/^action_[a-z0-9_]+$/)).min(1),
  priority: z.number().int().default(100)
});

export const ActionSchema = z.object({
  action_id: z.string().regex(/^action_[a-z0-9_]+$/),
  type: ActionTypeSchema,
  args: z.record(z.any()).default({})
});

export const MinigameCompletionSchema = z.object({
  minigame_id: z.string().regex(/^minigame_[a-z0-9_]+$/),
  action_chain: z.array(z.string().regex(/^action_[a-z0-9_]+$/)).min(1),
  payload_mapping: z.record(z.string(), z.string()).default({})
});

export const ChunkSchema = z.object({
  chunk_id: z.string().regex(/^chunk_[1-4]$/),
  summary: z.string().min(1),
  node_ids: z.array(z.string().regex(/^node_[a-z0-9_]+$/)).length(5)
});

export const CasePackageSchema = z.object({
  case_id: z.string().regex(/^case_[a-z0-9_]+$/),
  start_node_id: z.string().regex(/^node_[a-z0-9_]+$/),
  chunks: z.array(ChunkSchema).length(4),
  nodes: z.array(NodeSchema).length(20),
  objectives: z.array(ObjectiveSchema),
  flags: z.array(z.string().regex(/^flag_[a-z0-9_]+$/)).default([]),
  rewards: z.array(z.string().regex(/^reward_[a-z0-9_]+$/)).default([]),
  triggers: z.array(TriggerSchema).default([]),
  actions: z.array(ActionSchema).default([]),
  minigames: z.array(z.string().regex(/^minigame_[a-z0-9_]+$/)).default([]),
  minigame_completions: z.array(MinigameCompletionSchema).default([]),
  guardrails: z.array(z.string()).default([])
});

export type TriggerType = z.infer<typeof TriggerTypeSchema>;
export type ActionType = z.infer<typeof ActionTypeSchema>;
export type CasePackage = z.infer<typeof CasePackageSchema>;
export type Trigger = z.infer<typeof TriggerSchema>;
export type Action = z.infer<typeof ActionSchema>;
