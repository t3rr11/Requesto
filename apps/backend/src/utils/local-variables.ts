import type { EnvironmentVariable, EnvironmentVariableType } from '../models/environment';

/** A runtime current-value override, with the type it came in as (if known). */
export type LocalVariable = {
  value: string;
  type?: EnvironmentVariableType;
};

/** Normalise a stored sidecar entry (legacy plain string or `{ value, type }`). */
export function toLocalVariable(raw: string | LocalVariable): LocalVariable {
  if (typeof raw === 'string') return { value: raw };
  return { value: raw.value, ...(raw.type !== undefined && { type: raw.type }) };
}

/**
 * Merge current-value overrides into a variable list. Existing keys get
 * `currentValue` (and a recorded type) applied; unknown keys are appended as
 * read-back entries. Returns the same reference when there are no overrides.
 */
export function withCurrentValues(
  variables: EnvironmentVariable[],
  overrides: Record<string, LocalVariable>,
): EnvironmentVariable[];
export function withCurrentValues(
  variables: EnvironmentVariable[] | undefined,
  overrides: Record<string, LocalVariable>,
): EnvironmentVariable[] | undefined;
export function withCurrentValues(
  variables: EnvironmentVariable[] | undefined,
  overrides: Record<string, LocalVariable>,
): EnvironmentVariable[] | undefined {
  if (Object.keys(overrides).length === 0) return variables;
  const merged = [...(variables ?? [])].map((v) => {
    const entry = overrides[v.key];
    if (!entry) return v;
    return entry.type !== undefined
      ? { ...v, currentValue: entry.value, type: entry.type }
      : { ...v, currentValue: entry.value };
  });
  for (const [key, entry] of Object.entries(overrides)) {
    if (!merged.some((v) => v.key === key)) {
      merged.push({ key, value: '', currentValue: entry.value, enabled: true, ...(entry.type !== undefined && { type: entry.type }) });
    }
  }
  return merged;
}

/** Remove runtime current values from a variable list (for committed storage). */
export function withoutCurrentValues<T extends EnvironmentVariable[] | undefined>(variables: T): T {
  return (variables?.map(({ currentValue: _stripped, ...rest }) => rest)) as T;
}
