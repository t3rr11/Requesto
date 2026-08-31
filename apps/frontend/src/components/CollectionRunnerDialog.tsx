import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Dialog } from './Dialog';
import { useEnvironmentStore } from '../store/environments/store';
import { useRequestStore } from '../store/request/store';
import { substituteInRequest } from '../helpers/environment';
import { runPreRequestScript, runTestScript, type TestResult } from '../helpers/scriptRunner';
import { createRunnerIsolation, type RunnerIsolation } from '../helpers/runner/isolation';
import { buildDisplayItems, buildWorkspaceDisplayItems, buildProxyRequest, isVisible } from './runner/helpers';
import { RunnerToolbar } from './runner/RunnerToolbar';
import { RunnerCollectionRow } from './runner/RunnerCollectionRow';
import { RunnerFolderRow } from './runner/RunnerFolderRow';
import { RunnerRequestRow } from './runner/RunnerRequestRow';
import type { CollectionRunnerDialogProps, RequestRunResult, ExpandedTab, RequestStatus } from './runner/types';
import type { Environment } from '../store/environments/types';

export function CollectionRunnerDialog({ isOpen, onClose, collections, folderId }: CollectionRunnerDialogProps) {
  const { environmentsData } = useEnvironmentStore();
  const { sendRequest } = useRequestStore();

  // The dialog renders even when closed (and the store's collections can be
  // empty while loading or after a workspace switch) — never assume
  // collections[0] exists.
  const first = collections[0];
  const multi = collections.length > 1;
  const displayItems = useMemo(
    () =>
      !first
        ? []
        : multi
          ? buildWorkspaceDisplayItems(collections)
          : buildDisplayItems(first, folderId),
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
  const [isolationError, setIsolationError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isolationRef = useRef<RunnerIsolation | null>(null);

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

  const handleReset = useCallback(() => {
    setResults(requests.map(r => ({ request: r, status: 'pending', response: null, testResults: [] })));
    setExpandedRows(new Set());
    setExpandedTabs(new Map());
    setCollapsedFolders(new Set());
    setCollapsedCollections(new Set());
  }, [requests]);

  const handleRun = useCallback(async () => {
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setRunning(true);
    setIsolationError(null);

    // Reset to pending
    setResults(requests.map(r => ({ request: r, status: 'pending', response: null, testResults: [] })));

    // Track the live env state through the run so scripts can chain
    let liveEnv = activeEnv;

    // Every run operates in a scratch server-side workspace; whatever the
    // run creates or deletes is cleaned up in the finally block below and
    // the previous workspace is restored — the app's own data is untouched.
    try {
      const isolation = createRunnerIsolation();
      await isolation.setup();
      isolationRef.current = isolation;
    } catch (err) {
      setIsolationError(err instanceof Error ? err.message : String(err));
      setRunning(false);
      return;
    }

    try {
      for (let i = 0; i < requests.length; i++) {
        if (abortController.signal.aborted) {
          // Mark everything still pending as skipped
          setResults(prev => prev.map(r => (r.status === 'pending' ? { ...r, status: 'skipped' } : r)));
          break;
        }

        const req = requests[i];

        // Mark as running (by id — results may be re-keyed at any time)
        setResults(prev => prev.map(r => (r.request.id === req.id ? { ...r, status: 'running' } : r)));

        try {
          // Pre-request script
          let proxyReq = buildProxyRequest(req);
          if (req.preRequestScript?.trim()) {
            const envOverrides = await runPreRequestScript(req.preRequestScript, liveEnv, proxyReq);
            if (Object.keys(envOverrides).length > 0 && liveEnv) {
              // Current values are NOT persisted during runs: the server's
              // active workspace is the run's scratch workspace, which does
              // not contain this environment. Chaining happens through the
              // local liveEnv either way.
              liveEnv = {
                ...liveEnv,
                variables: liveEnv.variables.map(v =>
                  Object.prototype.hasOwnProperty.call(envOverrides, v.key)
                    ? { ...v, currentValue: envOverrides[v.key] }
                    : v,
                ),
              };
            }
          }

          // Variable substitution
          const substituted = substituteInRequest(proxyReq, liveEnv);
          proxyReq = { ...proxyReq, ...substituted };

          const start = Date.now();
          const response = await sendRequest(proxyReq, abortController.signal);
          const duration = Date.now() - start;

          // Test script
          let testResults: TestResult[] = [];
          let envOverrides: Record<string, string> = {};
          if (req.testScript?.trim()) {
            ({ testResults, envOverrides } = await runTestScript(req.testScript, response, proxyReq, liveEnv));
            if (Object.keys(envOverrides).length > 0 && liveEnv) {
              liveEnv = {
                ...liveEnv,
                variables: liveEnv.variables.map(v =>
                  Object.prototype.hasOwnProperty.call(envOverrides, v.key)
                    ? { ...v, currentValue: envOverrides[v.key] }
                    : v,
                ),
              };
            }
          }

          const allPassed = testResults.length === 0 || testResults.every(t => t.passed);
          const status: RequestStatus = testResults.length > 0
            ? (allPassed ? 'passed' : 'failed')
            : 'passed';

          setResults(prev => prev.map(r =>
            r.request.id === req.id ? { ...r, status, response, testResults, duration } : r,
          ));

          // Auto-expand rows that have test results
          if (testResults.length > 0) {
            setExpandedRows(prev => new Set([...prev, req.id]));
            setExpandedTabs(prev => new Map([...prev, [req.id, 'tests']]));
          }
        } catch (err) {
          setResults(prev => prev.map(r =>
            r.request.id === req.id
              ? { ...r, status: 'error', response: null, testResults: [], error: err instanceof Error ? err.message : String(err) }
              : r,
          ));
          setExpandedRows(prev => new Set([...prev, req.id]));
        }
      }
    } finally {
      if (isolationRef.current) {
        try {
          await isolationRef.current.teardown();
        } catch (err) {
          setIsolationError(err instanceof Error ? err.message : String(err));
        }
        isolationRef.current = null;
      }
      setRunning(false);
    }
  }, [requests, activeEnv, sendRequest]);

  const handleStop = () => {
    abortControllerRef.current?.abort();
  };

  const handleClose = () => {
    if (running) handleStop();
    onClose();
  };

  const finished = results.filter(r => r.status !== 'pending' && r.status !== 'running' && r.status !== 'skipped');
  const passedCount = results.filter(r => r.status === 'passed').length;
  const failedCount = results.filter(r => r.status === 'failed').length;
  const errorCount = results.filter(r => r.status === 'error').length;
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
    <Dialog isOpen={isOpen} onClose={handleClose} title={title} size="xl">
      <RunnerToolbar
        running={running}
        requestCount={requests.length}
        finishedCount={finished.length}
        passedCount={passedCount}
        failedCount={failedCount}
        errorCount={errorCount}
        totalTests={totalTests}
        passedTests={passedTests}
        onRun={handleRun}
        onStop={handleStop}
        onReset={handleReset}
      />

      {isolationError && (
        <div className="mt-3 text-sm text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900 rounded px-3 py-2">
          {isolationError}
        </div>
      )}

      {requests.length === 0 ? (
        <div className="py-16 text-center text-gray-400 dark:text-gray-500 text-sm">
          {multi ? 'No requests in these collections' : 'No requests in this collection'}
        </div>
      ) : (
        <div className="mt-4 space-y-1 overflow-y-auto max-h-[55vh]">
          {displayItems.map(item => {
            if (item.kind === 'collection') {
              return (
                <RunnerCollectionRow
                  key={`collection-${item.collectionId}`}
                  name={item.name}
                  collectionId={item.collectionId}
                  isCollapsed={collapsedCollections.has(item.collectionId)}
                  onToggle={handleToggleCollection}
                />
              );
            }
            if (!isVisible(item, collapsedFolders, collapsedCollections, allFolders)) return null;

            if (item.kind === 'folder') {
              return (
                <RunnerFolderRow
                  key={`folder-${item.folder.id}`}
                  folder={item.folder}
                  depth={item.depth}
                  isCollapsed={collapsedFolders.has(item.folder.id)}
                  onToggle={handleToggleFolder}
                />
              );
            }

            const result = resultsByRequestId.get(item.request.id)
              ?? { request: item.request, status: 'pending' as RequestStatus, response: null, testResults: [] };

            return (
              <RunnerRequestRow
                key={item.request.id}
                result={result}
                idx={requestIndices.get(item.request.id) ?? 0}
                depth={item.depth}
                isExpanded={expandedRows.has(item.request.id)}
                activeTab={expandedTabs.get(item.request.id) ?? 'tests'}
                onToggleExpand={handleToggleExpand}
                onSetTab={handleSetTab}
              />
            );
          })}
        </div>
      )}
    </Dialog>
  );
}
