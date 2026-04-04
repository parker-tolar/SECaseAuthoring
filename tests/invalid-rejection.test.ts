import { describe, expect, it } from 'vitest';
import { loadCaseOrThrow } from '../src/runtime/loader.js';
import { makeValidCase } from './fixtures/caseFactory.js';

describe('invalid case rejection', () => {
  it('blocks loading when guardrails missing', () => {
    const pkg = makeValidCase();
    pkg.guardrails = [];
    expect(() => loadCaseOrThrow(pkg)).toThrowError(/MISSING_GUARDRAIL/);
  });
});
