import { describe, expect, it } from 'vitest';
import { validateCasePackage } from '../src/validation/validator.js';
import { makeValidCase } from './fixtures/caseFactory.js';

describe('schema and stitching validator', () => {
  it('passes a valid package', () => {
    const report = validateCasePackage(makeValidCase());
    expect(report.summary.error_count).toBe(0);
  });

  it('rejects malformed and unreachable package', () => {
    const invalid = makeValidCase();
    invalid.nodes[19].choices = [];
    invalid.nodes[5].choices[0].target_node_id = 'node_missing';
    invalid.objectives[0].source_ref = 'flag_missing';

    const report = validateCasePackage(invalid);
    expect(report.summary.error_count).toBeGreaterThan(0);
    expect(report.issues.some((i) => i.code === 'OBJECTIVE_NO_COMPLETION_SOURCE')).toBe(true);
  });
});
