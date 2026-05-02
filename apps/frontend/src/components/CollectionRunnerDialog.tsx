import { useState, useRef, useCallback } from 'react';
import { Dialog } from './Dialog';
import { useEnvironmentStore } from '../store/environments/store';
import { useRequestStore } from '../store/request/store';
import { substituteInRequest } from '../helpers/environment';
import { runPreRequestScript, runTestScript, type TestResult } from '../helpers/scriptRunner';
import { buildDisplayItems, buildProxyRequest, isVisible } from './runner/helpers';
import { RunnerToolbar } from './runner/RunnerToolbar';
import { RunnerFolderRow } from './runner/RunnerFolderRow';
import { RunnerRequestRow } from './runner/RunnerRequestRow';
import type { CollectionRunnerDialogProps, RequestRunResult, ExpandedTab, RequestStatus } from './runner/types';
import type { Environment } from '../store/environments/types';

export function CollectionRunnerDialog({ isOpen, onClose, collection, folderId }: CollectionRunnerDialogProps) {
  const { environmentsData, updateCurrentValues } = useEnvironmentStore();
  const { sendRequest } = useRequestStore();

  const displayItems = buildDisplayItems(collection, folderId);
  const requests = displayItems
    .filter((item): item is Extract<typeof item, { kind: 'request' }> => item.kind === 'request')
    .map(item => item.request);

  const [results, setResults] = useState<RequestRunResult[]>(() =>
    requests.map(r => ({ request: r, status: 'pending', response: null, testResults: [] })),
  );
  const [running, setRunning] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [expandedTabs, setExpandedTabs] = useState<Map<string, ExpandedTab>>(new Map());
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);

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

  const handleReset = useCallback(() => {
    setResults(requests.map(r => ({ request: r, status: 'pending', response: null, testResults: [] })));
    setExpandedRows(new Set());
    setExpandedTabs(new Map());
    setCollapsedFolders(new Set());
  }, [requests]);

  const handleRun = useCallback(async () => {
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setRunning(true);

    // Reset to pending
    setResults(requests.map(r => ({ request: r, status: 'pending', response: null, testResults: [] })));

    // Track the live env state through the run so scripts can chain
    let liveEnv = activeEnv;

    for (let i = 0; i < requests.length; i++) {
      if (abortController.signal.aborted) {
        // Mark remaining as skipped
        setResults(prev => prev.map((r, j) => j >= i ? { ...r, status: 'skipped' } : r));
        break;
      }

      const req = requests[i];

      // Mark as running
      setResults(prev => prev.map((r, j) => j === i ? { ...r, status: 'running' } : r));

      try {
        // Pre-request script
        let proxyReq = buildProxyRequest(req);
        if (req.preRequestScript?.trim()) {
          const envOverrides = await runPreRequestScript(req.preRequestScript, liveEnv, proxyReq);
          if (Object.keys(envOverrides).length > 0 && liveEnv) {
            await updateCurrentValues(liveEnv.id, envOverrides);
            // Update local copy for variable substitution in subsequent steps
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
            await updateCurrentValues(liveEnv.id, envOverrides);
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

        setResults(prev => prev.map((r, j) =>
          j === i ? { ...r, status, response, testResults, duration } : r,
        ));

        // Auto-expand rows that have test results
        if (testResults.length > 0) {
          setExpandedRows(prev => new Set([...prev, req.id]));
          setExpandedTabs(prev => new Map([...prev, [req.id, 'tests']]));
        }
      } catch (err) {
        setResults(prev => prev.map((r, j) =>
          j === i
            ? { ...r, status: 'error', response: null, testResults: [], error: err instanceof Error ? err.message : String(err) }
            : r,
        ));
        setExpandedRows(prev => new Set([...prev, req.id]));
      }
    }

    setRunning(false);
  }, [requests, activeEnv, sendRequest, updateCurrentValues]);

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

  const folderName = folderId ? (collection.folders.find(f => f.id === folderId)?.name ?? 'Folder') : null;
  const requestIndices = new Map(requests.map((r, i) => [r.id, i]));
  const resultsByRequestId = new Map(results.map(r => [r.request.id, r]));

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title={folderName ? `Run: ${collection.name} / ${folderName}` : `Run: ${collection.name}`} size="xl">
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

      {requests.length === 0 ? (
        <div className="py-16 text-center text-gray-400 dark:text-gray-500 text-sm">
          No requests in this collection
        </div>
      ) : (
        <div className="mt-4 space-y-1 overflow-y-auto max-h-[55vh]">
          {displayItems.map(item => {
            if (!isVisible(item, collapsedFolders, collection.folders)) return null;

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

            const result = resultsByRequestId.get(item.request.id);
            if (!result) return null;

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
