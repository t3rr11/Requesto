import { useEffect, useMemo } from 'react';
import { Server } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { ConsolePanel } from '../components/ConsolePanel';
import { MockEndpointsSidebar } from '../components/mock/MockEndpointsSidebar';
import { MockEndpointEditor } from '../components/mock/MockEndpointEditor';
import { useMockStore } from '../store/mock/store';
import { useUIStore } from '../store/ui/store';
import { useAlertStore } from '../store/alert/store';
import type { ConsoleLog } from '../store/request/types';
import type { MockRequestLogEntry } from '../store/mock/types';

const STATUS_POLL_INTERVAL_MS = 3000;
const LOG_POLL_INTERVAL_MS = 2000;
const COLLAPSED_CONSOLE_HEIGHT = 37;

function toConsoleLogs(logs: MockRequestLogEntry[]): ConsoleLog[] {
  return logs.map((log) => ({
    id: log.id,
    requestId: log.id,
    timestamp: log.timestamp,
    type: 'response',
    method: log.method,
    url: log.path,
    status: log.status,
    duration: log.durationMs,
    responseData: {
      status: log.status,
      statusText: '',
      headers: log.responseHeaders,
      body: log.responseBody,
      bodyEncoding: 'utf8',
      duration: log.durationMs,
    },
  }));
}

export function MockServerPage() {
  const {
    endpoints,
    selectedEndpointId,
    status,
    error,
    logs,
    loadEndpoints,
    refreshStatus,
    loadLogs,
    clearLogs,
  } = useMockStore();
  const { isMockLogOpen, toggleMockLog, mockLogHeight, setMockLogHeight } = useUIStore();
  const { showAlert } = useAlertStore();
  const consoleLogs = useMemo(() => toConsoleLogs(logs), [logs]);

  const selectedEndpoint = endpoints.find((e) => e.id === selectedEndpointId) ?? null;

  useEffect(() => {
    void loadEndpoints();
    void refreshStatus();
    const interval = setInterval(refreshStatus, STATUS_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadEndpoints, refreshStatus]);

  useEffect(() => {
    if (!status.running) return;
    void loadLogs();
    const interval = setInterval(loadLogs, LOG_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [status.running, loadLogs]);

  useEffect(() => {
    if (error) {
      showAlert('Mock Server', error, 'error');
      useMockStore.getState().setError(null);
    }
  }, [error, showAlert]);

  return (
    <main className="overflow-hidden relative w-full h-full">
      <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
        <div
          className="flex-1 overflow-hidden flex min-h-0"
          style={{ paddingBottom: isMockLogOpen ? `${mockLogHeight}px` : `${COLLAPSED_CONSOLE_HEIGHT}px` }}
        >
          <MockEndpointsSidebar />
          <div className="flex-1 overflow-hidden flex flex-col min-w-0">
            {selectedEndpoint ? (
              <MockEndpointEditor key={selectedEndpoint.id} endpoint={selectedEndpoint} />
            ) : (
              <EmptyState
                icon={<Server className="w-12 h-12" />}
                title="No endpoint selected"
                description="Create an endpoint in the sidebar to start defining mock responses, then point your frontend at the mock server URL."
              />
            )}
          </div>
        </div>
      </div>

      <ConsolePanel
        isOpen={isMockLogOpen}
        consoleHeight={mockLogHeight}
        consoleLogs={consoleLogs}
        onToggle={toggleMockLog}
        onClear={clearLogs}
        onHeightChange={setMockLogHeight}
      />
    </main>
  );
}
