# SECaseAuthoring Audit: Stitching Protocol, Metadata Minigames, Gemini Authoring, and Normalized UI

Date: 2026-04-04 (UTC)

## Executive Summary

Current repository state is an empty scaffold (`.gitkeep` only). There is no runtime, schema layer, validator pipeline, authoring surface, or tests present yet. Therefore:

- **Current readiness for B/C/D/E**: effectively **0% implemented**.
- **Best next step**: establish a baseline architecture and implement in the order you specified in section F.

---

## Current-State Findings (Evidence)

- Repository contains only:
  - `.gitkeep`
- No source files, package manifests, test harnesses, UI components, or schemas are present.

Impact:

- None of the acceptance criteria in G can currently be satisfied.
- Non-goals in H are not violated yet, but there is no implementation to validate.

---

## How Close Are We? (Per expectation)

### B) Stitching protocol (compile-time validator)
Status: **Not started**.

Missing:
- Schema validation engine
- Graph reachability checks
- Chunk boundary policy checks
- Objective coverage checks
- Reward/flag integrity checks
- Trigger integrity checks
- Guardrail policy checks
- Structured error report format + actionable fix hints

### C) Minigame refactor to metadata
Status: **Not started**.

Missing:
- Trigger metadata model
- Action metadata model
- Dispatcher runtime
- Completion handler mapping by `minigame_id`
- Payload-to-formula mapping
- Determinism/telemetry contracts

### D) Gemini-based content authoring
Status: **Not started**.

Missing:
- Authoring form + strict fields
- Gemini generation service integration
- Draft generation model outputs
- Auto-validation gate
- Normalize/export pipeline

### E) Stripped-down normalized UI
Status: **Not started**.

Missing:
- Runtime player UI with only required surfaces
- Data-driven rendering (no bespoke case logic)

### F) Implementation order
Status: **Defined by requirement, not implemented**.

### G) Acceptance criteria
Status: **0 / 5 currently pass**.

### H) Non-goals
Status: **No observed violations**, but no code exists.

---

## Implementation Plan (Step-by-step, aligned to F)

## Phase 1 — Foundation: Metadata Types + Schema + Zod
Deliverables:
- `src/domain/case-metadata/types.ts`
- `src/domain/case-metadata/schema.json`
- `src/domain/case-metadata/zod.ts`
- `src/domain/case-metadata/constants.ts`

Key decisions:
- Canonical IDs: `case_<slug>`, `node_<chunk>_<index>`, `choice_<node>_<index>`, `obj_<slug>`, `flag_<slug>`, `reward_<slug>`, `minigame_<slug>`
- Deterministic generation from normalized input + stable hash suffix where needed
- Enum lock-down for trigger/action types

## Phase 2 — Stitching Validator + Error Report Format
Deliverables:
- `src/validation/stitching/validator.ts`
- `src/validation/stitching/rules/*.ts`
- `src/validation/stitching/report.ts`
- `src/validation/stitching/types.ts`

Validator pipeline order:
1. Schema validation
2. Graph reachability from start node
3. Chunk boundary policy validation
4. Objective coverage validation
5. Reward/flag integrity validation
6. Trigger integrity validation
7. Guardrail policy validation

Output:
- Structured report with `errors[]`, `warnings[]`, `summary`, `suggestedFixes[]`

## Phase 3 — Metadata Runtime Loader (Manifest Adapter)
Deliverables:
- `src/runtime/manifest/adapter.ts`
- `src/runtime/manifest/loader.ts`
- `src/runtime/manifest/backcompat.ts`

Responsibilities:
- Load normalized package
- Resolve references
- Support legacy case payloads via adapter for backward compatibility

## Phase 4 — Minigame Trigger/Action Dispatcher
Deliverables:
- `src/runtime/triggers/dispatcher.ts`
- `src/runtime/triggers/evaluator.ts`
- `src/runtime/actions/dispatcher.ts`
- `src/runtime/minigame/completion.ts`
- `src/runtime/minigame/formulas.ts`

Support required:
- Triggers: `on_choice_selected`, `on_node_enter`, `on_flag_present`
- Actions: `launch_minigame`, `grant_reward`, `set_flag`, `apply_currency_delta`, `goto_node`, `open_reflection_prompt`, `emit_mission_log`
- Completion routing by `minigame_id`
- Payload mapping (accuracy/latency/hydra influence) into formulas
- Deterministic execution order (stable sort by priority then id)
- Existing telemetry event names retained

## Phase 5 — Gemini Authoring Form + Generation Service
Deliverables:
- `src/authoring/form/model.ts`
- `src/authoring/form/validation.ts`
- `src/authoring/generation/gemini-client.ts`
- `src/authoring/generation/prompt.ts`
- `src/authoring/generation/normalizer.ts`

Form fields:
- narrative tone bounds
- conflict type
- ambiguity tolerance
- excluded topics/themes
- resolution style
- preferred NPC pressure pattern
- minigame usage preference

Generation outputs:
- 4 chunk summaries
- 20 stitched nodes
- objectives
- trigger metadata
- guardrail declarations

## Phase 6 — Draft Preview + Validator Errors UI
Deliverables:
- `src/ui/authoring/DraftPreview.tsx`
- `src/ui/authoring/ValidatorPanel.tsx`
- `src/ui/authoring/GenerateDraftButton.tsx`

Behavior:
- On generate: run validator
- Block publish if `errors.length > 0`
- Display actionable fix hints grouped by severity/category

## Phase 7 — Normalize & Export + Publish to Registry
Deliverables:
- `src/authoring/export/normalize.ts`
- `src/authoring/export/package.ts`
- `src/authoring/export/publish.ts`
- `src/case-registry/index.ts`

Guarantees:
- Manifest-compatible package
- Deterministic IDs/references
- Signature/checksum optional but recommended

## Phase 8 — Test Coverage
Deliverables:
- `tests/schema/*.test.ts`
- `tests/stitching/*.test.ts`
- `tests/runtime/trigger-dispatch.test.ts`
- `tests/runtime/objective-completion.test.ts`
- `tests/runtime/invalid-case-rejection.test.ts`
- `tests/backcompat/legacy-case-path.test.ts`

---

## File-by-File Change List (proposed)

## New core domain files
- `src/domain/case-metadata/types.ts`
- `src/domain/case-metadata/schema.json`
- `src/domain/case-metadata/zod.ts`
- `src/domain/case-metadata/examples/*.json`

## New validator files
- `src/validation/stitching/validator.ts`
- `src/validation/stitching/types.ts`
- `src/validation/stitching/report.ts`
- `src/validation/stitching/rules/schema.ts`
- `src/validation/stitching/rules/reachability.ts`
- `src/validation/stitching/rules/chunk-boundary.ts`
- `src/validation/stitching/rules/objective-coverage.ts`
- `src/validation/stitching/rules/reward-flag-integrity.ts`
- `src/validation/stitching/rules/trigger-integrity.ts`
- `src/validation/stitching/rules/guardrail-policy.ts`

## Runtime files
- `src/runtime/manifest/loader.ts`
- `src/runtime/manifest/adapter.ts`
- `src/runtime/manifest/backcompat.ts`
- `src/runtime/triggers/dispatcher.ts`
- `src/runtime/triggers/evaluator.ts`
- `src/runtime/actions/dispatcher.ts`
- `src/runtime/minigame/completion.ts`
- `src/runtime/minigame/formulas.ts`

## Authoring files
- `src/authoring/form/model.ts`
- `src/authoring/form/validation.ts`
- `src/authoring/generation/gemini-client.ts`
- `src/authoring/generation/prompt.ts`
- `src/authoring/generation/normalizer.ts`
- `src/authoring/export/normalize.ts`
- `src/authoring/export/package.ts`
- `src/authoring/export/publish.ts`

## UI files
- `src/ui/player/CurrentNodeView.tsx`
- `src/ui/player/ChoiceList.tsx`
- `src/ui/player/ObjectiveChecklist.tsx`
- `src/ui/player/MissionStatusCompact.tsx`
- `src/ui/player/LocationMapOrList.tsx`
- `src/ui/authoring/DraftPreview.tsx`
- `src/ui/authoring/ValidatorPanel.tsx`

## Tests
- `tests/schema/schema-validation.test.ts`
- `tests/stitching/stitching-validator.test.ts`
- `tests/runtime/trigger-dispatch.test.ts`
- `tests/runtime/objective-completion.test.ts`
- `tests/runtime/invalid-case-rejection.test.ts`
- `tests/backcompat/legacy-path.test.ts`

---

## Generated Schema Example (minimal)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "CasePackage",
  "type": "object",
  "required": ["case_id", "start_node_id", "chunks", "nodes", "objectives", "triggers", "actions"],
  "properties": {
    "case_id": { "type": "string", "pattern": "^case_[a-z0-9_]+$" },
    "start_node_id": { "type": "string", "pattern": "^node_[a-z0-9_]+$" },
    "chunks": {
      "type": "array",
      "minItems": 4,
      "maxItems": 4,
      "items": {
        "type": "object",
        "required": ["chunk_id", "summary", "node_ids"],
        "properties": {
          "chunk_id": { "type": "string", "pattern": "^chunk_[1-4]$" },
          "summary": { "type": "string", "minLength": 1 },
          "node_ids": { "type": "array", "minItems": 5, "maxItems": 5, "items": { "type": "string" } }
        }
      }
    },
    "nodes": {
      "type": "array",
      "minItems": 20,
      "maxItems": 20,
      "items": {
        "type": "object",
        "required": ["node_id", "body", "choices"],
        "properties": {
          "node_id": { "type": "string" },
          "body": { "type": "string" },
          "choices": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["choice_id", "label", "target_node_id"],
              "properties": {
                "choice_id": { "type": "string" },
                "label": { "type": "string" },
                "target_node_id": { "type": "string" }
              }
            }
          }
        }
      }
    }
  }
}
```

---

## Validator Error Examples (actionable)

```json
{
  "summary": { "error_count": 2, "warning_count": 1 },
  "errors": [
    {
      "code": "UNREACHABLE_NODE",
      "path": "nodes[14].node_id",
      "message": "node_chunk3_4 cannot be reached from start_node_id node_chunk1_1.",
      "suggested_fix": "Add an inbound choice transition from a reachable node or remove node_chunk3_4."
    },
    {
      "code": "OBJECTIVE_NO_COMPLETION_SOURCE",
      "path": "objectives[2]",
      "message": "Objective obj_validate_chain has no completion source in triggers/actions/minigame completion mappings.",
      "suggested_fix": "Add set_flag(flag_obj_validate_chain_done) or equivalent completion action tied to a reachable trigger."
    }
  ],
  "warnings": [
    {
      "code": "NONCANONICAL_NAME",
      "path": "flags[0].flag_id",
      "message": "Flag name 'hydraTrust' violates snake_case convention.",
      "suggested_fix": "Rename to flag_hydra_trust and update references."
    }
  ]
}
```

---

## Final Test Checklist

## Schema & stitching
- Validate well-formed 4x5 package passes schema and all stitching rules.
- Validate malformed package returns grouped structured errors with paths + fix hints.
- Ensure unreachable nodes are detected.
- Ensure chunk boundary violations are detected.

## Trigger/action runtime
- `on_choice_selected`, `on_node_enter`, `on_flag_present` resolve deterministically.
- `launch_minigame` dispatches and completion action chain runs by `minigame_id`.
- Payload mapping formulas are deterministic and bounded.

## Objective completion mapping
- Every declared objective is completable via at least one reachable source.
- False positives are not emitted for optional objectives if explicitly marked optional.

## Invalid case rejection paths
- Authoring draft with validator errors cannot publish.
- Export rejects dangling references.
- Runtime loader refuses unsafe packages.

## Backward compatibility
- Existing legacy case path can still load and execute via manifest adapter.
- Telemetry event names and key fields remain unchanged for current dashboards.

---

## Delivery Risk Notes

- The highest risk is coupling between authoring generation and runtime schema drift.
  - Mitigation: single canonical type source + generated artifacts.
- Second highest risk is nondeterminism in trigger/action ordering.
  - Mitigation: explicit sort + deterministic formula evaluation.
- Third risk is model output variability from Gemini.
  - Mitigation: strict post-generation normalization + validator gate before publish.

---

## Suggested Milestones

1. **M1 (1 sprint):** metadata schema + validator with error report.
2. **M2 (1 sprint):** runtime adapter + trigger/action dispatcher + minigame completion chain.
3. **M3 (1 sprint):** Gemini form + generation + preview/validation UI.
4. **M4 (1 sprint):** export/publish + comprehensive tests + backward compatibility hardening.

This plan gets you to measurable progress against all acceptance criteria while preserving non-goals.
