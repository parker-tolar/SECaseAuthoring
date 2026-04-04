import type { CasePackage } from '../domain/types.js';
import { validateCasePackage } from '../validation/validator.js';

export function loadCaseOrThrow(pkg: unknown): CasePackage {
  const report = validateCasePackage(pkg);
  if (report.summary.error_count > 0) {
    const lines = report.issues
      .filter((i) => i.severity === 'error')
      .map((i) => `${i.code} @ ${i.path}: ${i.message}`);
    throw new Error(`Case package rejected:\n${lines.join('\n')}`);
  }
  return pkg as CasePackage;
}
