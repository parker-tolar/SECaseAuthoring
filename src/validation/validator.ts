import { CasePackageSchema, type CasePackage } from '../domain/types.js';
import type { ValidationIssue, ValidationReport, ValidationRule } from './types.js';

const namingConventionRule: ValidationRule = (pkg) => {
  const issues: ValidationIssue[] = [];
  for (const flag of pkg.flags) {
    if (!/^flag_[a-z0-9_]+$/.test(flag)) {
      issues.push({
        code: 'NONCANONICAL_FLAG_NAME',
        severity: 'warning',
        path: 'flags',
        message: `Flag '${flag}' violates naming convention.`,
        suggested_fix: 'Use snake_case names prefixed with flag_.',
      });
    }
  }
  return issues;
};

const reachabilityRule: ValidationRule = (pkg) => {
  const visited = new Set<string>();
  const adj = new Map<string, string[]>();
  pkg.nodes.forEach((n) => adj.set(n.node_id, n.choices.map((c) => c.target_node_id)));

  const stack = [pkg.start_node_id];
  while (stack.length) {
    const id = stack.pop()!;
    if (visited.has(id)) continue;
    visited.add(id);
    for (const next of adj.get(id) ?? []) stack.push(next);
  }

  return pkg.nodes
    .filter((n) => !visited.has(n.node_id))
    .map<ValidationIssue>((n) => ({
      code: 'UNREACHABLE_NODE',
      severity: 'error',
      path: `nodes/${n.node_id}`,
      message: `${n.node_id} cannot be reached from ${pkg.start_node_id}.`,
      suggested_fix: `Add inbound transition to ${n.node_id} or remove the node.`,
    }));
};

const chunkBoundaryRule: ValidationRule = (pkg) => {
  const nodeIndex = new Map(pkg.nodes.map((n) => [n.node_id, n] as const));
  const issues: ValidationIssue[] = [];

  for (const node of pkg.nodes) {
    for (const choice of node.choices) {
      const target = nodeIndex.get(choice.target_node_id);
      if (!target) continue;
      const fromChunk = Number(node.chunk_id.split('_')[1]);
      const toChunk = Number(target.chunk_id.split('_')[1]);
      if (Math.abs(toChunk - fromChunk) > 1) {
        issues.push({
          code: 'CHUNK_BOUNDARY_VIOLATION',
          severity: 'error',
          path: `nodes/${node.node_id}/choices/${choice.choice_id}`,
          message: `Choice jumps from ${node.chunk_id} to ${target.chunk_id}.`,
          suggested_fix: 'Only transition within same or adjacent chunk.',
        });
      }
    }
  }
  return issues;
};

const objectiveCoverageRule: ValidationRule = (pkg) => {
  const issues: ValidationIssue[] = [];
  const set = new Set([...pkg.flags, ...pkg.rewards, ...pkg.minigame_completions.map((m) => m.minigame_id)]);
  for (const [idx, obj] of pkg.objectives.entries()) {
    if (!set.has(obj.source_ref)) {
      issues.push({
        code: 'OBJECTIVE_NO_COMPLETION_SOURCE',
        severity: 'error',
        path: `objectives/${idx}`,
        message: `${obj.objective_id} source_ref '${obj.source_ref}' is unresolved.`,
        suggested_fix: 'Set source_ref to a valid flag, reward, or minigame_id.',
      });
    }
  }
  return issues;
};

const rewardFlagIntegrityRule: ValidationRule = (pkg) => {
  const issues: ValidationIssue[] = [];
  const dedupeCheck = (values: string[], kind: 'FLAG' | 'REWARD') => {
    const seen = new Set<string>();
    values.forEach((v, i) => {
      if (seen.has(v)) {
        issues.push({
          code: `DUPLICATE_${kind}`,
          severity: 'error',
          path: `${kind.toLowerCase()}s/${i}`,
          message: `Duplicate ${kind.toLowerCase()} '${v}'.`,
          suggested_fix: `Remove duplicate ${kind.toLowerCase()} entry.`,
        });
      }
      seen.add(v);
    });
  };

  dedupeCheck(pkg.flags, 'FLAG');
  dedupeCheck(pkg.rewards, 'REWARD');

  const actionIds = new Set(pkg.actions.map((a) => a.action_id));
  pkg.triggers.forEach((t, i) => {
    t.action_chain.forEach((a) => {
      if (!actionIds.has(a)) {
        issues.push({
          code: 'DANGLING_ACTION_REF',
          severity: 'error',
          path: `triggers/${i}/action_chain`,
          message: `Trigger ${t.trigger_id} references missing action ${a}.`,
          suggested_fix: 'Create the action or remove it from action_chain.',
        });
      }
    });
  });

  return issues;
};

const triggerIntegrityRule: ValidationRule = (pkg) => {
  const validChoiceIds = new Set(pkg.nodes.flatMap((n) => n.choices.map((c) => c.choice_id)));
  const validNodeIds = new Set(pkg.nodes.map((n) => n.node_id));
  const validFlags = new Set(pkg.flags);

  return pkg.triggers.flatMap<ValidationIssue>((trigger, idx) => {
    const isValid =
      (trigger.type === 'on_choice_selected' && validChoiceIds.has(trigger.ref)) ||
      (trigger.type === 'on_node_enter' && validNodeIds.has(trigger.ref)) ||
      (trigger.type === 'on_flag_present' && validFlags.has(trigger.ref));

    if (isValid) return [];
    return [{
      code: 'INVALID_TRIGGER_REFERENCE',
      severity: 'error',
      path: `triggers/${idx}`,
      message: `${trigger.trigger_id} ref '${trigger.ref}' does not map to a valid entity for ${trigger.type}.`,
      suggested_fix: 'Use an existing choice_id, node_id, or flag id matching the trigger type.',
    }];
  });
};

const guardrailPolicyRule: ValidationRule = (pkg) => {
  const required = ['violence_filter', 'self_harm_filter'];
  return required
    .filter((g) => !pkg.guardrails.includes(g))
    .map<ValidationIssue>((guardrail) => ({
      code: 'MISSING_GUARDRAIL',
      severity: 'error',
      path: 'guardrails',
      message: `Required guardrail '${guardrail}' is missing.`,
      suggested_fix: `Add '${guardrail}' to guardrails declarations.`,
    }));
};

const rules: ValidationRule[] = [
  reachabilityRule,
  chunkBoundaryRule,
  objectiveCoverageRule,
  rewardFlagIntegrityRule,
  triggerIntegrityRule,
  guardrailPolicyRule,
  namingConventionRule,
];

export function validateCasePackage(raw: unknown): ValidationReport {
  const parsed = CasePackageSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      summary: { error_count: parsed.error.issues.length, warning_count: 0 },
      issues: parsed.error.issues.map((issue) => ({
        code: 'SCHEMA_VALIDATION_ERROR',
        severity: 'error' as const,
        path: issue.path.join('.'),
        message: issue.message,
        suggested_fix: 'Fix JSON shape to match CasePackageSchema.',
      })),
    };
  }

  const pkg: CasePackage = parsed.data;
  const issues = rules.flatMap((rule) => rule(pkg));
  return {
    summary: {
      case_id: pkg.case_id,
      error_count: issues.filter((i) => i.severity === 'error').length,
      warning_count: issues.filter((i) => i.severity === 'warning').length,
    },
    issues,
  };
}
