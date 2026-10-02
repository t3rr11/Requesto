import type {
  MockDatasetCounts,
  MockEndpoint,
  MockRequestLogEntry,
  MockServerStatus,
  NewMockEndpointInput,
} from './types';
import { API_BASE } from '../../helpers/api/config';
import { notifyDataMutated } from '../../hooks/useGitAutoRefresh';

type MockStateLike = {
  endpoints: MockEndpoint[];
  loading: boolean;
  selectedEndpointId: string | null;
  status: MockServerStatus;
  logs: MockRequestLogEntry[];
  error: string | null;
  datasetCounts: MockDatasetCounts;
};
type SetState = (
  partial: Partial<MockStateLike> | ((s: MockStateLike) => Partial<MockStateLike>),
) => void;

// ── Internal API helpers (not exported) ──────────────────────────────────────

async function getEndpointsApi(): Promise<MockEndpoint[]> {
  const res = await fetch(`${API_BASE}/mock/endpoints`);
  if (!res.ok) throw new Error('Failed to fetch mock endpoints');
  return res.json();
}

/** New endpoints start with a sensible static GET response the user can edit. */
function defaultGetResponse() {
  return { status: 200, headers: {}, contentType: 'json' as const, body: '{\n  \n}', delayMs: 0 };
}

async function createEndpointApi(data: NewMockEndpointInput): Promise<MockEndpoint> {
  const mode = data.mode ?? 'static';
  const res = await fetch(`${API_BASE}/mock/endpoints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: data.name,
      path: data.path,
      enabled: true,
      mode,
      methods: mode === 'static' ? { GET: defaultGetResponse() } : {},
    }),
  });
  if (!res.ok) throw new Error('Failed to create mock endpoint');
  return res.json();
}

async function updateEndpointApi(id: string, updates: Partial<MockEndpoint>): Promise<MockEndpoint> {
  const res = await fetch(`${API_BASE}/mock/endpoints/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const message = await res.json().catch(() => null);
    throw new Error(message?.error ?? 'Failed to update mock endpoint');
  }
  return res.json();
}

async function deleteEndpointApi(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/mock/endpoints/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete mock endpoint');
}

async function duplicateEndpointApi(id: string): Promise<MockEndpoint> {
  const res = await fetch(`${API_BASE}/mock/endpoints/${id}/duplicate`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to duplicate mock endpoint');
  return res.json();
}

async function reorderEndpointsApi(ids: string[]): Promise<void> {
  const res = await fetch(`${API_BASE}/mock/endpoints/reorder`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error('Failed to reorder mock endpoints');
}

async function resetDataApi(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/mock/endpoints/${id}/data`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to clear endpoint data');
}

async function updateDatasetApi(id: string, records: unknown[]): Promise<void> {
  const res = await fetch(`${API_BASE}/mock/endpoints/${id}/data`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(records),
  });
  if (!res.ok) {
    const message = await res.json().catch(() => null);
    throw new Error(message?.error ?? 'Failed to save endpoint data');
  }
}

async function getStatusApi(): Promise<MockServerStatus> {
  const res = await fetch(`${API_BASE}/mock/status`);
  if (!res.ok) throw new Error('Failed to fetch mock server status');
  return res.json();
}

async function getLogsApi(): Promise<MockRequestLogEntry[]> {
  const res = await fetch(`${API_BASE}/mock/logs`);
  if (!res.ok) throw new Error('Failed to fetch mock request log');
  return res.json();
}

async function getDatasetApi(endpointId: string): Promise<unknown[]> {
  const res = await fetch(`${API_BASE}/mock/endpoints/${endpointId}/data`);
  if (!res.ok) throw new Error('Failed to fetch endpoint dataset');
  return res.json();
}

// ── Last-selected endpoint persistence ───────────────────────────────────────

const LAST_ENDPOINT_KEY = 'requesto-mock-last-endpoint';

function readLastEndpointId(): string | null {
  try {
    return localStorage.getItem(LAST_ENDPOINT_KEY);
  } catch {
    return null;
  }
}

function writeLastEndpointId(id: string | null): void {
  try {
    if (id) localStorage.setItem(LAST_ENDPOINT_KEY, id);
    else localStorage.removeItem(LAST_ENDPOINT_KEY);
  } catch {
    // Storage unavailable; selection just won't persist
  }
}

/** Keep the current selection if still valid, else the last-used endpoint, else the first one. */
function resolveSelection(endpoints: MockEndpoint[], current: string | null): string | null {
  const exists = (id: string | null) => id !== null && endpoints.some((e) => e.id === id);
  if (exists(current)) return current;
  const last = readLastEndpointId();
  if (exists(last)) return last;
  return endpoints[0]?.id ?? null;
}

// ── Store action implementations ─────────────────────────────────────────────

export async function loadEndpoints(set: SetState): Promise<void> {
  try {
    const endpoints = await getEndpointsApi();
    set((state) => ({
      endpoints,
      selectedEndpointId: resolveSelection(endpoints, state.selectedEndpointId),
      loading: false,
      error: null,
    }));
  } catch (error) {
    set({
      loading: false,
      error: error instanceof Error ? error.message : 'Failed to load mock endpoints',
    });
  }
}

export function selectEndpoint(set: SetState, id: string | null): void {
  writeLastEndpointId(id);
  set({ selectedEndpointId: id });
}

export async function createEndpoint(set: SetState, data: NewMockEndpointInput): Promise<MockEndpoint> {
  const created = await createEndpointApi(data);
  writeLastEndpointId(created.id);
  set((state) => ({
    endpoints: [...state.endpoints, created],
    selectedEndpointId: created.id,
  }));
  notifyDataMutated();
  return created;
}

export async function updateEndpoint(
  set: SetState,
  id: string,
  updates: Partial<MockEndpoint>,
): Promise<boolean> {
  try {
    const updated = await updateEndpointApi(id, updates);
    set((state) => ({
      endpoints: state.endpoints.map((e) => (e.id === id ? updated : e)),
      error: null,
    }));
    notifyDataMutated();
    return true;
  } catch (error) {
    set({ error: error instanceof Error ? error.message : 'Failed to update mock endpoint' });
    return false;
  }
}

export async function deleteEndpoint(set: SetState, id: string): Promise<boolean> {
  try {
    await deleteEndpointApi(id);
    set((state) => {
      const endpoints = state.endpoints.filter((e) => e.id !== id);
      const selectedEndpointId =
        state.selectedEndpointId === id ? (endpoints[0]?.id ?? null) : state.selectedEndpointId;
      writeLastEndpointId(selectedEndpointId);
      return { endpoints, selectedEndpointId };
    });
    notifyDataMutated();
    return true;
  } catch (error) {
    set({ error: error instanceof Error ? error.message : 'Failed to delete mock endpoint' });
    return false;
  }
}

export async function duplicateEndpoint(set: SetState, id: string): Promise<boolean> {
  try {
    const created = await duplicateEndpointApi(id);
    set((state) => ({ endpoints: [...state.endpoints, created] }));
    notifyDataMutated();
    return true;
  } catch (error) {
    set({ error: error instanceof Error ? error.message : 'Failed to duplicate mock endpoint' });
    return false;
  }
}

/** Fetch the dynamic dataset so the editor can display/edit it. */
export async function loadDataset(endpointId: string): Promise<unknown[]> {
  return getDatasetApi(endpointId);
}

export async function updateDataset(
  set: SetState,
  id: string,
  records: unknown[],
): Promise<boolean> {
  try {
    await updateDatasetApi(id, records);
    set((state) => ({ datasetCounts: { ...state.datasetCounts, [id]: records.length }, error: null }));
    return true;
  } catch (error) {
    set({ error: error instanceof Error ? error.message : 'Failed to save endpoint data' });
    return false;
  }
}

export async function reorderEndpoints(set: SetState, ids: string[]): Promise<void> {
  try {
    await reorderEndpointsApi(ids);
    set((state) => {
      const byId = new Map(state.endpoints.map((e) => [e.id, e]));
      return { endpoints: ids.map((id) => byId.get(id)).filter((e): e is MockEndpoint => Boolean(e)) };
    });
  } catch (error) {
    set({ error: error instanceof Error ? error.message : 'Failed to reorder mock endpoints' });
  }
}

/** Clear the endpoint's dynamic dataset; the next read starts empty. */
export async function clearEndpointData(set: SetState, id: string): Promise<boolean> {
  try {
    await resetDataApi(id);
    set((state) => ({ datasetCounts: { ...state.datasetCounts, [id]: 0 } }));
    return true;
  } catch (error) {
    set({ error: error instanceof Error ? error.message : 'Failed to clear endpoint data' });
    return false;
  }
}

export async function refreshDatasetCount(set: SetState, id: string): Promise<void> {
  try {
    const records = await getDatasetApi(id);
    set((state) => ({ datasetCounts: { ...state.datasetCounts, [id]: records.length } }));
  } catch {
    // The dataset preview is best-effort; keep the previous count on failure
  }
}

export async function refreshStatus(set: SetState): Promise<void> {
  try {
    const status = await getStatusApi();
    set({ status, error: null });
  } catch {
    // Backend unreachable — keep the last known status rather than blanking the UI
  }
}

export async function loadLogs(set: SetState): Promise<void> {
  try {
    const logs = await getLogsApi();
    set({ logs });
  } catch {
    // Log polling is best-effort; ignore transient failures
  }
}

export function clearLogs(set: SetState): void {
  set({ logs: [] });
  fetch(`${API_BASE}/mock/logs`, { method: 'DELETE' }).catch(() => {});
}

export function setError(set: SetState, message: string | null): void {
  set({ error: message });
}
