import type { Action, CasePackage, Trigger } from '../domain/types.js';

export interface RuntimeState {
  currentNodeId: string;
  flags: Set<string>;
  rewards: Set<string>;
  currency: number;
  missionLog: string[];
  telemetry: Array<{ event: string; payload: Record<string, unknown> }>;
}

export interface TriggerContext {
  type: Trigger['type'];
  ref: string;
}

function stableTriggerSort(a: Trigger, b: Trigger): number {
  return a.priority === b.priority
    ? a.trigger_id.localeCompare(b.trigger_id)
    : a.priority - b.priority;
}

export function createInitialState(pkg: CasePackage): RuntimeState {
  return {
    currentNodeId: pkg.start_node_id,
    flags: new Set(),
    rewards: new Set(),
    currency: 0,
    missionLog: [],
    telemetry: [],
  };
}

function emit(state: RuntimeState, event: string, payload: Record<string, unknown>): void {
  state.telemetry.push({ event, payload });
}

export function dispatchTrigger(pkg: CasePackage, state: RuntimeState, ctx: TriggerContext): void {
  const actionsById = new Map<string, Action>(pkg.actions.map((a) => [a.action_id, a]));

  const matched = pkg.triggers
    .filter((t) => t.type === ctx.type && t.ref === ctx.ref)
    .sort(stableTriggerSort);

  for (const trigger of matched) {
    for (const actionId of trigger.action_chain) {
      const action = actionsById.get(actionId);
      if (!action) continue;
      runAction(state, action);
    }
  }
}

function runAction(state: RuntimeState, action: Action): void {
  switch (action.type) {
    case 'launch_minigame':
      emit(state, 'minigame_launched', { minigame_id: action.args.minigame_id });
      break;
    case 'grant_reward':
      state.rewards.add(String(action.args.reward_id));
      emit(state, 'reward_granted', { reward_id: action.args.reward_id });
      break;
    case 'set_flag':
      state.flags.add(String(action.args.flag_id));
      emit(state, 'flag_set', { flag_id: action.args.flag_id });
      break;
    case 'apply_currency_delta':
      state.currency += Number(action.args.delta ?? 0);
      emit(state, 'currency_delta', { delta: action.args.delta ?? 0 });
      break;
    case 'goto_node':
      state.currentNodeId = String(action.args.node_id);
      emit(state, 'node_goto', { node_id: action.args.node_id });
      break;
    case 'open_reflection_prompt':
      emit(state, 'reflection_opened', { prompt_id: action.args.prompt_id });
      break;
    case 'emit_mission_log':
      state.missionLog.push(String(action.args.message));
      emit(state, 'mission_log', { message: action.args.message });
      break;
  }
}

function safeNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function resolveMinigameCompletion(
  pkg: CasePackage,
  state: RuntimeState,
  minigame_id: string,
  payload: Record<string, unknown>
): void {
  const completion = pkg.minigame_completions.find((m) => m.minigame_id === minigame_id);
  if (!completion) return;

  const actionsById = new Map(pkg.actions.map((a) => [a.action_id, a]));

  for (const actionId of completion.action_chain) {
    const baseAction = actionsById.get(actionId);
    if (!baseAction) continue;
    const action: Action = {
      ...baseAction,
      args: { ...baseAction.args },
    };

    // formula mapping example: "currency_delta": "accuracy*10-latency"
    if (action.type === 'apply_currency_delta' && completion.payload_mapping.currency_delta) {
      const accuracy = safeNumber(payload.accuracy);
      const latency = safeNumber(payload.latency);
      const hydra = safeNumber(payload.hydra_influence);
      action.args.delta = Math.round(accuracy * 10 - latency + hydra * 2);
    }

    if (action.type === 'set_flag' && completion.payload_mapping.flag_by_accuracy) {
      const accuracy = safeNumber(payload.accuracy);
      if (accuracy >= 0.8 && action.args.high_flag) {
        action.args.flag_id = action.args.high_flag;
      } else if (action.args.low_flag) {
        action.args.flag_id = action.args.low_flag;
      }
    }

    runAction(state, action);
  }

  emit(state, 'minigame_completed', { minigame_id, payload });
}
