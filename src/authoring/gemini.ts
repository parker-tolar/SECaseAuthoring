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

export function buildPrompt(input: AuthoringInput): string {
  return JSON.stringify(input);
}

export async function generateDraftCase(
  input: AuthoringInput,
  geminiClient: GeminiClient,
  deterministicCaseId = 'case_generated'
): Promise<{ draft: CasePackage; validation: ReturnType<typeof validateCasePackage> }> {
  const draftBody = await geminiClient.generateDraft(buildPrompt(input));
  const draft: CasePackage = { ...draftBody, case_id: deterministicCaseId };
  const validation = validateCasePackage(draft);
  return { draft, validation };
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
