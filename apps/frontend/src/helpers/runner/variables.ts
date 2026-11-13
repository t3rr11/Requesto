import type { Collection } from '../../store/collections/types';
import type { Environment, EnvironmentVariableType } from '../../store/environments/types';
import type { ScriptEnvOverrides, ScriptVarsContext } from 'requesto-engine/runner';
import {
  effectiveVariablesWithOverrides,
  mergeScriptOverrides,
  type ScriptOverrideSet,
  type ScriptScopeOverrides,
} from '../environment';

export type RunnerVariableRow = {
  key: string;
  value: string;
  type?: EnvironmentVariableType;
  isSecret: boolean;
};

/** Script-set values accumulated during a run, keyed by scope, for the runner variables rail. */
export type RunnerScriptOverrides = {
  env: ScriptScopeOverrides;
  collections: Record<string, ScriptScopeOverrides>;
};

/** Which script last changed a variable, for attribution in the variables rail. */
export type RunnerVariableChange = {
  seq: number;
  requestId: string;
  label: string;
  phase: 'pre' | 'test';
};

/** One script-made value change, kept in run order so earlier changes survive later ones. */
export type RunnerVariableChangeEvent = {
  seq: number;
  key: string;
  /** Value before the script ran; absent when the script created the key. */
  from?: string;
  to: string;
  isSecret: boolean;
  phase: 'pre' | 'test';
  scopeLabel: string;
};

/** Live variables state for the runner rail: pre-run baseline for diffs, the
 *  script-set overrides, per-scope change stamps, and the per-request change
 *  history for the rows' Variables tab. */
export type RunnerVariablesState = {
  seq: number;
  /** Resolved values per scope captured at run start, for diffs. */
  baseline: {
    env: Record<string, string>;
    collections: Record<string, Record<string, string>>;
  };
  overrides: RunnerScriptOverrides;
  changes: {
    env: Record<string, RunnerVariableChange>;
    collections: Record<string, Record<string, RunnerVariableChange>>;
  };
  history: Record<string, RunnerVariableChangeEvent[]>;
};

/** The variables one collection's requests resolve during a run: the merged
 *  effective list with display fields; disabled and empty keys never resolve,
 *  so they are dropped. */
export function runnerVariableRows(
  environment: Environment | null,
  collection: Collection | null,
  overrides?: ScriptOverrideSet,
): RunnerVariableRow[] {
  return effectiveVariablesWithOverrides(environment, collection, overrides).variables.map(v => ({
    key: v.key,
    value: v.currentValue ?? v.value ?? '',
    ...(v.type !== undefined && { type: v.type }),
    isSecret: v.isSecret === true,
  }));
}

/** The request whose scripts are currently recording outcomes. */
export type ScriptAttribution = { id: string; label: string };

/** One scope's merged variable rows, keyed by variable key, for diffing. */
const rowsByKey = (
  environment: Environment | null,
  collection: Collection | null,
  overrides: { env?: ScriptScopeOverrides; collection?: ScriptScopeOverrides } = {},
): Map<string, RunnerVariableRow> =>
  new Map(runnerVariableRows(environment, collection, overrides).map(row => [row.key, row]));

/** Fold one script outcome into the run's variables state: merge the
 *  script-set values into their own scope, then diff the keys the outcome
 *  touched, stamping change attribution and appending to the request's
 *  history. Environment values are shared, so that scope diffs once. */
export function applyScriptOutcome(
  state: RunnerVariablesState,
  outcome: ScriptEnvOverrides,
  vars: ScriptVarsContext | undefined,
  phase: 'pre' | 'test',
  attribution: ScriptAttribution | null,
  environment: Environment | null,
  collections: Collection[],
): RunnerVariablesState {
  const seq = state.seq + 1;
  const env: ScriptScopeOverrides = { values: {} };
  mergeScriptOverrides(env, state.overrides.env);
  mergeScriptOverrides(env, {
    values: outcome.envOverrides,
    types: outcome.envTypes,
    cleared: outcome.envCleared,
  });

  const collectionScopes: Record<string, ScriptScopeOverrides> = { ...state.overrides.collections };
  const collectionId = vars?.collectionId;
  const collection = collectionId ? collections.find(c => c.id === collectionId) : undefined;
  if (collectionId) {
    const scope: ScriptScopeOverrides = { values: {} };
    const prevScope = state.overrides.collections[collectionId];
    if (prevScope) mergeScriptOverrides(scope, prevScope);
    mergeScriptOverrides(scope, {
      values: outcome.collectionOverrides ?? {},
      types: outcome.collectionTypes,
      cleared: outcome.collectionCleared,
    });
    collectionScopes[collectionId] = scope;
  }

  const changes: RunnerVariablesState['changes'] = {
    env: { ...state.changes.env },
    collections: { ...state.changes.collections },
  };
  const events: RunnerVariableChangeEvent[] = [];
  if (attribution) {
    const recordEvent = (
      key: string,
      before: RunnerVariableRow | undefined,
      after: RunnerVariableRow | undefined,
      scopeLabel: string,
      scope: 'env' | 'collection',
    ) => {
      if (!before && !after) return;
      // A script-cleared key resolves to nothing; the diff records an empty value.
      const to = after?.value ?? '';
      if (before?.value === to) return;
      events.push({
        seq,
        key,
        to,
        isSecret: after?.isSecret ?? before?.isSecret ?? false,
        phase,
        ...(before && { from: before.value }),
        scopeLabel,
      });
      const stamp: RunnerVariableChange = {
        seq,
        requestId: attribution.id,
        label: attribution.label,
        phase,
      };
      if (scope === 'env') {
        changes.env[key] = stamp;
      } else if (collectionId) {
        changes.collections[collectionId] = { ...changes.collections[collectionId], [key]: stamp };
      }
    };

    const envBefore = rowsByKey(environment, null, { env: state.overrides.env });
    const envAfter = rowsByKey(environment, null, { env });
    for (const key of [...Object.keys(outcome.envOverrides ?? {}), ...(outcome.envCleared ?? [])]) {
      recordEvent(key, envBefore.get(key), envAfter.get(key), 'Environment', 'env');
    }

    if (collection && collectionId) {
      const beforeRows = rowsByKey(environment, collection, { collection: state.overrides.collections[collectionId] });
      const afterRows = rowsByKey(environment, collection, { collection: collectionScopes[collectionId] });
      for (const key of [...Object.keys(outcome.collectionOverrides ?? {}), ...(outcome.collectionCleared ?? [])]) {
        recordEvent(key, beforeRows.get(key), afterRows.get(key), collection.name, 'collection');
      }
    }
  }

  const history =
    attribution && events.length > 0
      ? { ...state.history, [attribution.id]: [...(state.history[attribution.id] ?? []), ...events] }
      : state.history;

  return {
    seq,
    baseline: state.baseline,
    overrides: { env, collections: collectionScopes },
    changes,
    history,
  };
}
