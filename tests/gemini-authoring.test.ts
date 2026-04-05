import { describe, expect, it } from 'vitest';
import {
  AuthoringFlowError,
  createDefaultAuthoringClient,
  GeminiHttpClient,
  LlamaLocalClient,
  LocalAuthoringModelClient,
  generateDraftCase,
  type AuthoringInput,
  type GeminiClient,
} from '../src/authoring/gemini.js';

const input: AuthoringInput = {
  narrative_tone_bounds: 'serious',
  conflict_type: 'technical',
  ambiguity_tolerance: 'medium',
  excluded_topics: ['none'],
  resolution_style: 'procedural',
  preferred_npc_pressure_pattern: 'ramp',
  minigame_usage_preference: 'medium',
};

describe('gemini authoring', () => {
  it('falls back to local deterministic draft when client fails', async () => {
    const failingClient: GeminiClient = {
      async generateDraft() {
        throw new AuthoringFlowError('404 model not found', 'flow_execution');
      },
    };

    const result = await generateDraftCase(input, failingClient, 'case_fallback');
    expect(result.usedFallback).toBe(true);
    expect(result.validation.summary.error_count).toBe(0);
    expect(result.draft.minigames).toContain('minigame_lithcalic_override');
  });


  it('rewrites legacy gemini-pro model id to a supported model', async () => {
    const urls: string[] = [];
    const fetchMock: typeof fetch = async (url) => {
      urls.push(String(url));
      const body = {
        candidates: [{ content: { parts: [{ text: JSON.stringify({
          start_node_id: 'node_auto_c1_1',
          chunks: [1,2,3,4].map((n) => ({ chunk_id: `chunk_${n}`, summary: `S${n}`, node_ids: Array.from({ length: 5 }, (_, i) => `node_auto_c${n}_${i + 1}`) })),
          nodes: [1,2,3,4].flatMap((n) => Array.from({ length: 5 }, (_, i) => ({ node_id: `node_auto_c${n}_${i + 1}`, chunk_id: `chunk_${n}`, body: 'B', choices: [{ choice_id: `choice_node_auto_c${n}_${i + 1}_next`, label: 'Next', target_node_id: `node_auto_c${n}_${Math.min(i + 2, 5)}` }] }))),
          objectives: [{ objective_id: 'obj_x', description: 'd', completion_source: 'flag', source_ref: 'flag_x' }],
          flags: ['flag_x'], rewards: [], minigames: [], triggers: [], actions: [], minigame_completions: [], guardrails: ['violence_filter', 'self_harm_filter']
        }) }] } }]
      };
      return new Response(JSON.stringify(body), { status: 200 });
    };

    const client = new GeminiHttpClient({ apiKey: 'test', fetchImpl: fetchMock, models: ['gemini-pro'] });
    await client.generateDraft('prompt');
    expect(urls[0]).toContain('/models/gemini-1.5-pro:generateContent');
  });

  it('tries next model when first is 404', async () => {
    const fetchMock: typeof fetch = async (url) => {
      const str = String(url);
      if (str.includes('gemini-2.5-flash')) {
        return new Response('{"error":"not found"}', { status: 404 });
      }

      const body = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    start_node_id: 'node_auto_c1_1',
                    chunks: [1, 2, 3, 4].map((n) => ({
                      chunk_id: `chunk_${n}`,
                      summary: `S${n}`,
                      node_ids: Array.from({ length: 5 }, (_, i) => `node_auto_c${n}_${i + 1}`),
                    })),
                    nodes: [1, 2, 3, 4].flatMap((n) =>
                      Array.from({ length: 5 }, (_, i) => ({
                        node_id: `node_auto_c${n}_${i + 1}`,
                        chunk_id: `chunk_${n}`,
                        body: 'B',
                        choices: [{
                          choice_id: `choice_node_auto_c${n}_${i + 1}_next`,
                          label: 'Next',
                          target_node_id: `node_auto_c${n}_${Math.min(i + 2, 5)}`,
                        }],
                      }))
                    ),
                    objectives: [{
                      objective_id: 'obj_x',
                      description: 'd',
                      completion_source: 'flag',
                      source_ref: 'flag_x',
                    }],
                    flags: ['flag_x'],
                    rewards: [],
                    minigames: [],
                    triggers: [],
                    actions: [],
                    minigame_completions: [],
                    guardrails: ['violence_filter', 'self_harm_filter'],
                  }),
                },
              ],
            },
          },
        ],
      };

      return new Response(JSON.stringify(body), { status: 200 });
    };

    const client = new GeminiHttpClient({ apiKey: 'test', fetchImpl: fetchMock, models: ['gemini-2.5-flash', 'gemini-2.0-flash'] });
    const draft = await client.generateDraft('prompt');
    expect(draft.start_node_id).toBe('node_auto_c1_1');
  });

  it('supports local deterministic model flow without network', async () => {
    const client = new LocalAuthoringModelClient();
    const result = await generateDraftCase(
      {
        ...input,
        conflict_type: 'ethical',
        resolution_style: 'principled',
      },
      client,
      'case_local_offline'
    );

    expect(result.usedFallback).toBe(false);
    expect(result.draft.case_id).toBe('case_local_offline');
    expect(result.draft.chunks[0].summary).toContain('(ethical)');
    expect(result.validation.summary.error_count).toBe(0);
  });

  it('supports local llama3 quantized generation path', async () => {
    const fetchMock: typeof fetch = async (_url) => {
      const payload = {
        response: JSON.stringify({
          start_node_id: 'node_auto_c1_1',
          chunks: [1, 2, 3, 4].map((n) => ({
            chunk_id: `chunk_${n}`,
            summary: `chunk_${n}`,
            node_ids: Array.from({ length: 5 }, (_, i) => `node_auto_c${n}_${i + 1}`),
          })),
          nodes: [1, 2, 3, 4].flatMap((n) =>
            Array.from({ length: 5 }, (_, i) => ({
              node_id: `node_auto_c${n}_${i + 1}`,
              chunk_id: `chunk_${n}`,
              body: 'B',
              choices: [{
                choice_id: `choice_node_auto_c${n}_${i + 1}_next`,
                label: 'Next',
                target_node_id: `node_auto_c${n}_${Math.min(i + 2, 5)}`,
              }],
            }))
          ),
          objectives: [{
            objective_id: 'obj_x',
            description: 'd',
            completion_source: 'flag',
            source_ref: 'flag_x',
          }],
          flags: ['flag_x'],
          rewards: [],
          minigames: [],
          triggers: [],
          actions: [],
          minigame_completions: [],
          guardrails: ['violence_filter', 'self_harm_filter'],
        }),
      };
      return new Response(JSON.stringify(payload), { status: 200 });
    };

    const client = new LlamaLocalClient({ fetchImpl: fetchMock, model: 'llama3.1:8b-instruct-q4_K_M' });
    const draft = await client.generateDraft('prompt');
    expect(draft.start_node_id).toBe('node_auto_c1_1');
  });

  it('defaults provider factory to local llama', () => {
    const client = createDefaultAuthoringClient();
    expect(client).toBeInstanceOf(LlamaLocalClient);
  });
});
