import type { CasePackage } from '../domain/types.js';

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationIssue {
  code: string;
  severity: ValidationSeverity;
  path: string;
  message: string;
  suggested_fix: string;
}

export interface ValidationReport {
  summary: {
    case_id?: string;
    error_count: number;
    warning_count: number;
  };
  issues: ValidationIssue[];
}

export type ValidationRule = (pkg: CasePackage) => ValidationIssue[];
