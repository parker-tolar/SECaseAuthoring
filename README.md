# SE Case Authoring

A metadata-driven case authoring and runtime execution foundation for:

- compile-time stitching validation,
- metadata-based minigame triggers/completions,
- Gemini-style draft generation workflow,
- normalized player UI data projection.

## What is implemented

## B) Stitching protocol validator
`src/validation/validator.ts` implements:

1. Schema validation (via Zod `CasePackageSchema`)
2. Graph reachability from `start_node_id`
3. Chunk boundary policy checks
4. Objective coverage checks
5. Reward/flag integrity checks (duplicates + dangling action refs)
6. Trigger integrity checks (refs must map to real nodes/choices/flags)
7. Guardrail policy checks

Validation emits structured issues with:
- `code`
- `severity`
- `path`
- `message`
- `suggested_fix`

## C) Minigame metadata runtime
`src/runtime/engine.ts` supports:

### Trigger types
- `on_choice_selected`
- `on_node_enter`
- `on_flag_present`

### Action types
- `launch_minigame(minigame_id)`
- `grant_reward`
- `set_flag`
- `apply_currency_delta`
- `goto_node`
- `open_reflection_prompt`
- `emit_mission_log`

### Completion dispatch
- Resolve completion by `minigame_id`
- Deterministic action execution
- Payload mapping for `accuracy`, `latency`, `hydra_influence`

Telemetry is emitted with stable event names like:
- `minigame_launched`
- `minigame_completed`
- `reward_granted`
- `flag_set`
- `currency_delta`

## D) Gemini-based authoring workflow primitives
`src/authoring/gemini.ts` provides:

- strict `AuthoringInput` model,
- prompt builder,
- `generateDraftCase(...)` orchestration against an injected `GeminiClient`,
- post-generation auto-validation,
- `normalizeAndExport(...)` with deterministic ordering.

## E) Normalized UI projection
`src/ui/normalized-view.ts` provides a minimal player projection containing only:

- current node body,
- choices,
- objective checklist,
- compact mission status,
- optional locations list.

No case-specific component branching is required by this projection.

---

## Data model overview

Primary schema lives in `src/domain/types.ts` via `CasePackageSchema`.

The case package includes:
- chunks (4)
- nodes (20)
- objectives
- triggers
- actions
- minigame completions
- guardrails

IDs are conventioned (`case_*`, `node_*`, `choice_*`, `obj_*`, `flag_*`, `reward_*`, `minigame_*`).

---

## Getting started

```bash
npm install
npm test
npm run build
```

---

## Test coverage

Current tests include:

- `tests/schema-stitching.test.ts`
- `tests/trigger-dispatch.test.ts`
- `tests/objective-mapping.test.ts`
- `tests/invalid-rejection.test.ts`

These cover:
- schema/stitching validation,
- trigger/action dispatch,
- objective completion mapping,
- invalid case rejection paths.

---

## Backward compatibility note

The repo currently has no legacy runtime artifacts. `src/runtime/loader.ts` is structured to enforce validator gates now and can be extended with a legacy manifest adapter without bypassing validation.
