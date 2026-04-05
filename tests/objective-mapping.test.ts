import { describe, expect, it } from 'vitest';
import { validateCasePackage } from '../src/validation/validator.js';
import { makeValidCase } from './fixtures/caseFactory.js';

describe('objective completion mapping', () => {
  it('ensures every objective has a completion source', () => {
    const report = validateCasePackage(makeValidCase());
    expect(report.issues.some((i) => i.code === 'OBJECTIVE_NO_COMPLETION_SOURCE')).toBe(false);
  });
});
