import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Dialog } from './Dialog';
import { useEnvironmentStore } from '../store/environments/store';
import { useCollectionsStore } from '../store/collections/store';
import { useRequestStore } from '../store/request/store';
import { runCollections, buildCollectionItems, buildWorkspaceItems } from 'requesto-engine/runner';
import type { RunnerEvent, ScriptEnvOverrides, ScriptVarsContext } from 'requesto-engine/runner';
import { browserScriptRunner } from '../helpers/scriptRunner';
import { effectiveVariables, mergeScriptOverrides, type ScriptScopeOverrides } from '../helpers/environment';
import { applyScriptOutcome } from '../helpers/runner/variables';
import { createRunnerIsolation, type RunnerIsolation } from '../helpers/runner/isolation';
import { networkErrorFromResponse } from '../helpers/runner/networkError';
import { useSettingsStore } from '../store/settings/store';
import { isVisible } from './runner/helpers';
import { RunnerToolbar } from './runner/RunnerToolbar';
import { RunnerCollectionRow } from './runner/RunnerCollectionRow';
import { RunnerFolderRow } from './runner/RunnerFolderRow';
import { RunnerRequestRow } from './runner/RunnerRequestRow';
import { RunnerVariablesRail } from './runner/RunnerVariablesRail';
import { CollectionVariablesDialog } from '../forms/CollectionVariablesDialog';
import { EnvironmentVariablesDialog } from '../forms/EnvironmentVariablesDialog';
import type { CollectionRunnerDialogProps, RequestRunResult, ExpandedTab, RequestStatus, RunnerVariablesState } from './runner/types';
import type { Environment, EnvironmentVariableType } from '../store/environments/types';

// The engine resolves OAuth server-side for the app (the proxy endpoint
// handles auth configs), so the run itself never needs a token.
const noopOAuthResolver = async () => ({ accessToken: '', tokenType: 'Bearer' });

export function CollectionRunnerDialog({ isOpen, onClose, collections, folderId }: CollectionRunnerDialogProps) {
  const { environmentsData, updateCurrentValues, resetCurrentValues } = useEnvironmentStore();
  const { updateCollectionCurrentValues, resetCollectionCurrentValue } = useCollectionsStore();
  const { sendRequest } = useRequestStore();
  const warnOnHttpErrors = useSettingsStore(s => s.warnOnHttpErrors);

  // The dialog renders even when closed (and the store's collections can be
  // empty while loading or after a workspace switch); never assume
  // collections[0] exists.
  const first = collections[0];
  const multi = collections.length > 1;
  const displayItems = useMemo(
    () =>
      !first
        ? []
        : multi
          ? buildWorkspaceItems(collections)
          : buildCollectionItems(first, folderId ? new Set([folderId]) : undefined),
    [first, multi, collections, folderId],
  );
  const allFolders = useMemo(() => collections.flatMap(c => c.folders || []), [collections]);
  const requests = useMemo(
    () =>
      displayItems
        .filter((item): item is Extract<typeof item, { kind: 'request' }> => item.kind === 'request')
        .map(item => item.request),
    [displayItems],
  );

  const [results, setResults] = useState<RequestRunResult[]>(() =>
    requests.map(r => ({ request: r, status: 'pending', response: null, testResults: [] })),
  );

  // Keep results in sync with the request list: the dialog renders even when
  // closed, so the store's collections can change (or arrive late) after
  // mount. Without this, a list that grew after the first render would render
  // rows whose result entries don't exist yet.
  useEffect(() => {
    setResults(prev => {
      const byId = new Map(prev.map(r => [r.request.id, r]));
      return requests.map(r => byId.get(r.id) ?? { request: r, status: 'pending', response: null, testResults: [] });
    });
  }, [requests]);
  const [running, setRunning] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [expandedTabs, setExpandedTabs] = useState<Map<string, ExpandedTab>>(new Map());
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [collapsedCollections, setCollapsedCollections] = useState<Set<string>>(new Set());
  const [excludedCollections, setExcludedCollections] = useState<Set<string>>(new Set());
  const [isolationError, setIsolationError] = useState<string | null>(null);
  const [variablesCollapsed, setVariablesCollapsed] = useState(false);
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
  const [editingEnvironment, setEditingEnvironment] = useState(false);
  const [runVariables, setRunVariables] = useState<RunnerVariablesState>({ seq: 0, baseline: { env: {}, collections: {} }, overrides: { env: { values: {} }, collections: {} }, changes: { env: {}, collections: {} }, history: {} });
  const abortControllerRef = useRef<AbortController | null>(null);
  const isolationRef = useRef<RunnerIsolation | null>(null);
  const currentRequestRef = useRef<{ id: string; label: string } | null>(null);

  const activeEnv: Environment | null =
    environmentsData.environments.find(e => e.id === environmentsData.activeEnvironmentId) ?? null;

  const handleToggleExpand = (id: string) =>
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleSetTab = (id: string, tab: ExpandedTab) =>
    setExpandedTabs(prev => new Map([...prev, [id, tab]]));

  const handleToggleFolder = (id: string) =>
    setCollapsedFolders(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleToggleCollection = (id: string) =>
    setCollapsedCollections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleToggleCollectionCheck = (id: string) =>
    setExcludedCollections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const includedCollections = useMemo(
    () => collections.filter(c => !excludedCollections.has(c.id)),
    [collections, excludedCollections],
  );
  const includedRequests = useMemo(
    () => requests.filter(r => !excludedCollections.has(r.collectionId)),
    [requests, excludedCollections],
  );

  // EXPLAIN: the resolved values at run start become the baseline, so diffs survive the post-run persistence.
  const buildVariablesState = useCallback((): RunnerVariablesState => {
    return {
      seq: 0,
      baseline: {
        env: Object.fromEntries(
          effectiveVariables(activeEnv, null).variables.map(v => [v.key, v.currentValue ?? v.value ?? '']),
        ),
        collections: Object.fromEntries(includedCollections.map(collection => [
          collection.id,
          Object.fromEntries(
            effectiveVariables(activeEnv, collection).variables.map(v => [v.key, v.currentValue ?? v.value ?? '']),
          ),
        ])),
      },
      overrides: { env: { values: {} }, collections: {} },
      changes: { env: {}, collections: {} },
      history: {},
    };
  }, [includedCollections, activeEnv]);

  const handleReset = useCallback(() => {
    setResults(requests.map(r => ({ request: r, status: 'pending', response: null, testResults: [] })));
    setExpandedRows(new Set());
    setExpandedTabs(new Map());
    setCollapsedFolders(new Set());
    setCollapsedCollections(new Set());
    setExcludedCollections(new Set());
    setRunVariables(buildVariablesState());
  }, [requests, buildVariablesState]);

  const handleRun = useCallback(async () => {
    if (includedCollections.length === 0) return;
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setRunning(true);
    setIsolationError(null);
    setRunVariables(buildVariablesState());

    // Excluded collections never emit events, so mark them skipped up front.
    setResults(requests.map(r =>
      excludedCollections.has(r.collectionId)
        ? { request: r, status: 'skipped', response: null, testResults: [] }
        : { request: r, status: 'pending', response: null, testResults: [] },
    ));

    // Keep workspace mutations isolated, but retain script-set current values
    // to apply to the original environment after the workspace is restored.
    try {
      const isolation = createRunnerIsolation();
      await isolation.setup();
      isolationRef.current = isolation;
    } catch (err) {
      setIsolationError(err instanceof Error ? err.message : String(err));
      setRunning(false);
      return;
    }

    const handleEvent = (event: RunnerEvent) => {
      if (event.type === 'request-start') {
        currentRequestRef.current = { id: event.request.id, label: `${event.request.method} ${event.request.name}` };
        setResults(prev => prev.map(r => (r.request.id === event.request.id ? { ...r, status: 'running' } : r)));
        return;
      }
      if (event.type !== 'request-end') return;
      const result = event.result;
      const status: RequestStatus = result.status;
      setResults(prev => prev.map(r =>
        r.request.id === result.request.id
          ? {
              ...r,
              status,
              response: result.response,
              testResults: result.testResults,
              duration: result.duration,
              error: result.error,
              warning: result.warning,
              warningKind: result.warningKind,
            }
          : r,
      ));

      // Auto-expand rows that have test results, errors or warnings
      if (result.testResults.length > 0 || result.status === 'error' || result.status === 'warned') {
        setExpandedRows(prev => new Set([...prev, result.request.id]));
        if (result.testResults.length > 0) {
          setExpandedTabs(prev => new Map([...prev, [result.request.id, 'tests']]));
        }
      }
    };

    // Environment script-set values, accumulated for persistence after the
    // run. Collection script-set values are attributed to their collection
    // via the vars context the engine passes to the script runners.
    const envScript: ScriptScopeOverrides = { values: {} };
    const collectionOverrides = new Map<string, ScriptScopeOverrides>();
    const recordOutcome = (outcome: ScriptEnvOverrides, vars: ScriptVarsContext | undefined, phase: 'pre' | 'test') => {
      mergeScriptOverrides(envScript, {
        values: outcome.envOverrides,
        types: outcome.envTypes,
        cleared: outcome.envCleared,
      });
      if (vars?.collectionId) {
        const scope = collectionOverrides.get(vars.collectionId) ?? { values: {} };
        mergeScriptOverrides(scope, {
          values: outcome.collectionOverrides ?? {},
          types: outcome.collectionTypes,
          cleared: outcome.collectionCleared,
        });
        collectionOverrides.set(vars.collectionId, scope);
      }
      // GOTCHA: attribution must be captured synchronously; state updaters run after React batches, by which time the ref may name the next request.
      const touched = currentRequestRef.current;
      setRunVariables(prev => applyScriptOutcome(prev, outcome, vars, phase, touched, activeEnv, includedCollections));
    };
    try {
      await runCollections({
        collections: includedCollections,
        environment: activeEnv,
        oauthResolver: noopOAuthResolver,
        send: (request, ctx) => {
          const response = sendRequest(request, ctx.signal);
          // Align with the CLI: the proxy controller turns network failures
          // into a synthetic HTTP-200 response with status 0, which the engine
          // would otherwise report as a plain pass. Throw so the run marks
          // these as `error`.
          return response.then(response => {
            const networkError = networkErrorFromResponse(response);
            if (networkError) throw networkError;
            return response;
          });
        },
        warnings: { httpErrorStatuses: warnOnHttpErrors },
        scripts: {
          runPreRequest: async (script, env, request, envTypes, vars) => {
            const outcome = await browserScriptRunner.runPreRequest(script, env, request, envTypes, vars);
            recordOutcome(outcome, vars, 'pre');
            return outcome;
          },
          runTest: async (script, response, request, env, envTypes, vars) => {
            const outcome = await browserScriptRunner.runTest(script, response, request, env, envTypes, vars);
            recordOutcome(outcome, vars, 'test');
            return outcome;
          },
        },
        folders: folderId ? [folderId] : undefined,
        signal: abortController.signal,
        onEvent: handleEvent,
      });
    } finally {
      if (isolationRef.current) {
        try {
          await isolationRef.current.teardown();
          if (activeEnv) {
            try {
              // Only pass types when scripts recorded one, so value-only
              // persists keep their two-argument shape.
              if (Object.keys(envScript.values).length > 0) {
                await updateCurrentValues(
                  activeEnv.id,
                  envScript.values,
                  ...(envScript.types && Object.keys(envScript.types).length > 0
                    ? [envScript.types as Record<string, EnvironmentVariableType>]
                    : []),
                );
              }
              await Promise
                .all((envScript.cleared ?? [])
                .map(key => resetCurrentValues(activeEnv.id, key)));
            } catch (err) {
              throw new Error(`Could not save runner current values: ${err instanceof Error ? err.message : String(err)}`);
            }
          }

          // Collection script-set values persist per collection after the
          // workspace is restored, same as the environment values above.
          try {
            for (const [collectionId, scope] of collectionOverrides) {
              if (Object.keys(scope.values).length > 0) {
                await updateCollectionCurrentValues(
                  collectionId,
                  scope.values,
                  ...(scope.types && Object.keys(scope.types).length > 0 ? [scope.types] : []),
                );
              }
              for (const key of scope.cleared ?? []) {
                await resetCollectionCurrentValue(collectionId, key);
              }
            }
          } catch (err) {
            throw new Error(`Could not save runner current values: ${err instanceof Error ? err.message : String(err)}`);
          }
        } catch (err) {
          setIsolationError(err instanceof Error ? err.message : String(err));
        }
        isolationRef.current = null;
      }
      abortControllerRef.current = null;
      setRunning(false);
    }
  }, [
    includedCollections,
    excludedCollections,
    requests,
    activeEnv,
    sendRequest,
    updateCurrentValues,
    resetCurrentValues,
    updateCollectionCurrentValues,
    resetCollectionCurrentValue,
    warnOnHttpErrors,
    folderId,
    buildVariablesState
  ]);

  const handleStop = () => {
    abortControllerRef.current?.abort();
  };

  const handleClose = () => {
    if (running) handleStop();
    onClose();
  };

  const editingCollection = editingCollectionId
    ? collections.find(c => c.id === editingCollectionId) ?? null
    : null;

  const finished = results.filter(r => r.status !== 'pending' && r.status !== 'running' && r.status !== 'skipped');
  const passedCount = results.filter(r => r.status === 'passed').length;
  const failedCount = results.filter(r => r.status === 'failed').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const warnedCount = results.filter(r => r.status === 'warned').length;
  const totalTests = results.reduce((acc, r) => acc + r.testResults.length, 0);
  const passedTests = results.reduce((acc, r) => acc + r.testResults.filter(t => t.passed).length, 0);

  const folderName = folderId && first && !multi ? (first.folders.find(f => f.id === folderId)?.name ?? 'Folder') : null;
  const title = !first
    ? 'Run Collections'
    : folderName
      ? `Run: ${first.name} / ${folderName}`
      : multi
        ? 'Run: All Collections'
        : `Run: ${first.name}`;
  const requestIndices = new Map(requests.map((r, i) => [r.id, i]));
  const resultsByRequestId = new Map(results.map(r => [r.request.id, r]));

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      onCloseRequest={() => {
        if (!editingCollection && !editingEnvironment) handleClose();
      }}
      title={title}
      size="full"
      fullBleed
    >
      <div className="flex flex-col h-full">
        <div className="px-6 pt-4 shrink-0">
          <RunnerToolbar
            running={running}
            requestCount={includedRequests.length}
            finishedCount={finished.length}
            passedCount={passedCount}
            failedCount={failedCount}
            errorCount={errorCount}
            warnedCount={warnedCount}
            totalTests={totalTests}
            passedTests={passedTests}
            onRun={handleRun}
            onStop={handleStop}
            onReset={handleReset}
          />
        </div>

        {isolationError && (
          <div className="mx-6 mt-3 shrink-0 text-sm text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900 rounded px-3 py-2">
            {isolationError}
          </div>
        )}

        <div className="flex flex-1 min-h-0 px-6 pb-6 pt-4">
          <div className="flex-1 min-w-0 overflow-y-auto pr-4">
            {requests.length === 0 ? (
              <div className="py-16 text-center text-gray-400 dark:text-gray-500 text-sm">
                {multi ? 'No requests in these collections' : 'No requests in this collection'}
              </div>
            ) : (
              <div className="space-y-1">
                {displayItems.map(item => {
                  const collectionId = item.kind === 'collection'
                    ? item.collectionId
                    : item.kind === 'folder'
                      ? item.folder.collectionId
                      : item.request.collectionId;
                  const isExcluded = excludedCollections.has(collectionId);
                  const dimmed = isExcluded ? 'opacity-40 pointer-events-none' : undefined;

                  if (item.kind === 'collection') {
                    return (
                      <RunnerCollectionRow
                        key={`collection-${item.collectionId}`}
                        name={item.name}
                        collectionId={item.collectionId}
                        isCollapsed={collapsedCollections.has(item.collectionId)}
                        onToggle={handleToggleCollection}
                        {...(multi && {
                          isChecked: !isExcluded,
                          onToggleCheck: handleToggleCollectionCheck,
                        })}
                      />
                    );
                  }
                  if (!isVisible(item, collapsedFolders, collapsedCollections, allFolders)) return null;

                  if (item.kind === 'folder') {
                    return (
                      <div key={`folder-${item.folder.id}`} className={dimmed}>
                        <RunnerFolderRow
                          folder={item.folder}
                          depth={item.depth}
                          isCollapsed={collapsedFolders.has(item.folder.id)}
                          onToggle={handleToggleFolder}
                        />
                      </div>
                    );
                  }

                  const result = resultsByRequestId.get(item.request.id)
                    ?? { request: item.request, status: 'pending' as RequestStatus, response: null, testResults: [] };

                  return (
                    <div key={item.request.id} className={dimmed}>
                      <RunnerRequestRow
                        result={result}
                        idx={requestIndices.get(item.request.id) ?? 0}
                        depth={item.depth}
                        isExpanded={expandedRows.has(item.request.id)}
                        activeTab={expandedTabs.get(item.request.id) ?? 'tests'}
                        variableChanges={runVariables.history[item.request.id] ?? []}
                        onToggleExpand={handleToggleExpand}
                        onSetTab={handleSetTab}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <RunnerVariablesRail
            collections={includedCollections}
            environment={activeEnv}
            state={runVariables}
            isCollapsed={variablesCollapsed}
            onToggleCollapsed={() => setVariablesCollapsed(prev => !prev)}
            onEditEnvironment={() => setEditingEnvironment(true)}
            onEditCollection={setEditingCollectionId}
          />
        </div>
      </div>
      {editingEnvironment && activeEnv && (
        <EnvironmentVariablesDialog
          isOpen
          onClose={() => setEditingEnvironment(false)}
          environment={activeEnv}
        />
      )}
      {editingCollection && (
        <CollectionVariablesDialog
          isOpen
          onClose={() => setEditingCollectionId(null)}
          collection={editingCollection}
        />
      )}
    </Dialog>
  );
}
