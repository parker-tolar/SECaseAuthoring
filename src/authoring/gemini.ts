import { validateCasePackage } from '../validation/validator.js';
import type { CasePackage } from '../domain/types.js';

export interface AuthoringInput {
  narrative_tone_bounds: string;
  conflict_type: string;
  ambiguity_tolerance: 'low' | 'medium' | 'high';
  excluded_topics: string[];
  resolution_style: string;
  preferred_npc_pressure_pattern: string;
  minigame_usage_preference: 'light' | 'medium' | 'heavy';
}

export interface GeminiClient {
  generateDraft(prompt: string): Promise<Omit<CasePackage, 'case_id'>>;
}

export class AuthoringFlowError extends Error {
  constructor(
    message: string,
    public readonly code: 'flow_execution' | 'invalid_model_response',
    public readonly details: Record<string, unknown> = {}
  ) {
    super(message);
  }
}

export interface GeminiHttpClientOptions {
  apiKey: string;
  baseUrl?: string;
  models?: string[];
  fetchImpl?: typeof fetch;
}

interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

export class GeminiHttpClient implements GeminiClient {
  private readonly baseUrl: string;
  private readonly models: string[];
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: GeminiHttpClientOptions) {
    this.baseUrl = options.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta';
    this.models = options.models ?? ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async generateDraft(prompt: string): Promise<Omit<CasePackage, 'case_id'>> {
    const failures: Array<{ model: string; status: number; body: string }> = [];

    for (const model of this.models) {
      const url = `${this.baseUrl}/models/${model}:generateContent?key=${this.options.apiKey}`;
      const res = await this.fetchImpl(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${prompt}\nReturn ONLY valid JSON for Omit<CasePackage,'case_id'>.` }] }],
          generationConfig: { temperature: 0.2 },
        }),
      });

      const body = await res.text();
      if (!res.ok) {
        failures.push({ model, status: res.status, body });
        if (res.status === 404) continue;
        throw new AuthoringFlowError('AI generation failed.', 'flow_execution', { model, status: res.status, body });
      }

      const payload = JSON.parse(body) as GeminiGenerateResponse;
      const text = payload.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
      const json = extractJson(text);
      if (!json) {
        throw new AuthoringFlowError('Model response did not contain valid JSON.', 'invalid_model_response', { model });
      }

      try {
        return JSON.parse(json) as Omit<CasePackage, 'case_id'>;
      } catch {
        throw new AuthoringFlowError('Model JSON parsing failed.', 'invalid_model_response', { model, response: text });
      }
    }

    throw new AuthoringFlowError(
      'AI generation flow failed entirely. Tried all configured Gemini models.',
      'flow_execution',
      { failures }
    );
  }
}

function extractJson(raw: string): string | null {
  const fenced = raw.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenced) return fenced[1];

  const first = raw.indexOf('{');
  const last = raw.lastIndexOf('}');
  if (first >= 0 && last > first) {
    return raw.slice(first, last + 1);
  }
  return null;
}

export function buildPrompt(input: AuthoringInput): string {
  return JSON.stringify(input);
}

function buildFallbackDraft(): Omit<CasePackage, 'case_id'> {
  const chunks = [1, 2, 3, 4].map((n) => {
    const chunk_id = `chunk_${n}`;
    const node_ids = Array.from({ length: 5 }, (_, i) => `node_auto_c${n}_${i + 1}`);
    return { chunk_id, summary: `Auto-generated chunk ${n}`, node_ids };
  });

  const nodes = chunks.flatMap((chunk, cidx) =>
    chunk.node_ids.map((node_id, nidx) => ({
      node_id,
      chunk_id: chunk.chunk_id,
      body: `Auto-generated narrative for ${node_id}`,
      choices: [
        {
          choice_id: `choice_${node_id}_next`,
          label: 'Proceed',
          target_node_id:
            nidx < 4
              ? chunk.node_ids[nidx + 1]
              : cidx < 3
                ? chunks[cidx + 1].node_ids[0]
                : chunk.node_ids[nidx],
        },
      ],
      location: `location_${cidx + 1}`,
    }))
  );

  return {
    start_node_id: 'node_auto_c1_1',
    chunks,
    nodes,
    objectives: [
      {
        objective_id: 'obj_complete_lithcalic_override',
        description: 'Complete Lithcalic Override minigame.',
        completion_source: 'minigame_completion',
        source_ref: 'minigame_lithcalic_override',
      },
    ],
    flags: ['flag_training_ready', 'flag_lithcalic_success', 'flag_lithcalic_retry'],
    rewards: ['reward_lithcalic_cert'],
    minigames: ['minigame_lithcalic_override', 'minigame_calibration_valves', 'minigame_de_escalation'],
    triggers: [
      {
        trigger_id: 'trigger_enter_start_launch_lithcalic',
        type: 'on_node_enter',
        ref: 'node_auto_c1_1',
        action_chain: ['action_launch_lithcalic', 'action_mission_log_unlocked'],
        priority: 5,
      },
    ],
    actions: [
      { action_id: 'action_launch_lithcalic', type: 'launch_minigame', args: { minigame_id: 'minigame_lithcalic_override' } },
      {
        action_id: 'action_set_lithcalic_flag',
        type: 'set_flag',
        args: { high_flag: 'flag_lithcalic_success', low_flag: 'flag_lithcalic_retry', flag_id: 'flag_lithcalic_retry' },
      },
      { action_id: 'action_lithcalic_reward', type: 'grant_reward', args: { reward_id: 'reward_lithcalic_cert' } },
      { action_id: 'action_lithcalic_currency', type: 'apply_currency_delta', args: { delta: 0 } },
      { action_id: 'action_mission_log_unlocked', type: 'emit_mission_log', args: { message: 'Tactical drills unlocked.' } },
    ],
    minigame_completions: [
      {
        minigame_id: 'minigame_lithcalic_override',
        action_chain: ['action_set_lithcalic_flag', 'action_lithcalic_currency', 'action_lithcalic_reward'],
        payload_mapping: {
          currency_delta: 'accuracy*10-latency+hydra*2',
          flag_by_accuracy: '>=0.8=>success',
        },
      },
    ],
    guardrails: ['violence_filter', 'self_harm_filter'],
  };
}

export async function generateDraftCase(
  input: AuthoringInput,
  geminiClient: GeminiClient,
  deterministicCaseId = 'case_generated',
  options: { localFallbackOnFailure?: boolean } = { localFallbackOnFailure: true }
): Promise<{ draft: CasePackage; validation: ReturnType<typeof validateCasePackage>; usedFallback: boolean }> {
  let draftBody: Omit<CasePackage, 'case_id'>;
  let usedFallback = false;

  try {
    draftBody = await geminiClient.generateDraft(buildPrompt(input));
  } catch (error) {
    if (!options.localFallbackOnFailure) {
      throw error;
    }
    draftBody = buildFallbackDraft();
    usedFallback = true;
  }

  const draft: CasePackage = { ...draftBody, case_id: deterministicCaseId };
  const validation = validateCasePackage(draft);
  return { draft, validation, usedFallback };
}

export function normalizeAndExport(pkg: CasePackage): string {
  const normalized = {
    ...pkg,
    nodes: [...pkg.nodes].sort((a, b) => a.node_id.localeCompare(b.node_id)),
    actions: [...pkg.actions].sort((a, b) => a.action_id.localeCompare(b.action_id)),
    triggers: [...pkg.triggers].sort((a, b) => a.trigger_id.localeCompare(b.trigger_id)),
  };

  return JSON.stringify(normalized, null, 2);
}
