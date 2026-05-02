import type { Environment, EnvironmentsData } from './types';
import { API_BASE } from '../../helpers/api/config';
import { downloadJSON, readJSONFile } from '../../helpers/file';
import { notifyDataMutated } from '../../hooks/useGitAutoRefresh';

// ── Internal API helpers (not exported) ──────────────────────────────────────

async function getEnvironmentsApi(): Promise<EnvironmentsData> {
  const res = await fetch(`${API_BASE}/environments`);
  if (!res.ok) throw new Error('Failed to fetch environments');
  return res.json();
}

async function saveEnvironmentApi(environment: Environment): Promise<void> {
  const res = await fetch(`${API_BASE}/environments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(environment),
  });
  if (!res.ok) throw new Error('Failed to save environment');
}

async function deleteEnvironmentApi(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/environments/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete environment');
}

async function setActiveEnvironmentApi(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/environments/active`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error('Failed to set active environment');
}

// ── Store actions ────────────────────────────────────────────────────────────

type SetState = (partial: Record<string, unknown>) => void;
type GetState = () => { environmentsData: EnvironmentsData };

export async function loadEnvironments(set: SetState): Promise<void> {
  set({ loading: true });
  try {
    const data = await getEnvironmentsApi();
    set({ environmentsData: data });
    notifyDataMutated();
  } catch (error) {
    console.error('Failed to load environments:', error);
    throw error;
  } finally {
    set({ loading: false });
  }
}

export async function setActiveEnvironment(set: SetState, id: string): Promise<void> {
  try {
    await setActiveEnvironmentApi(id);
    await loadEnvironments(set);
  } catch (error) {
    console.error('Failed to set active environment:', error);
    throw error;
  }
}

export async function saveEnvironment(
  set: SetState,
  get: GetState,
  environment: Environment,
): Promise<void> {
  try {
    await saveEnvironmentApi(environment);

    const { environmentsData } = get();
    const idx = environmentsData.environments.findIndex((e) => e.id === environment.id);

    if (idx >= 0) {
      const updated = [...environmentsData.environments];
      updated[idx] = environment;
      set({ environmentsData: { ...environmentsData, environments: updated } });
    } else {
      set({
        environmentsData: {
          ...environmentsData,
          environments: [...environmentsData.environments, environment],
        },
      });
    }
  } catch (error) {
    console.error('Failed to save environment:', error);
    throw error;
  }
}

export async function deleteEnvironment(
  set: SetState,
  get: GetState,
  id: string,
): Promise<void> {
  try {
    await deleteEnvironmentApi(id);

    const { environmentsData } = get();
    set({
      environmentsData: {
        ...environmentsData,
        environments: environmentsData.environments.filter((e) => e.id !== id),
        activeEnvironmentId:
          environmentsData.activeEnvironmentId === id ? null : environmentsData.activeEnvironmentId,
      },
    });
  } catch (error) {
    console.error('Failed to delete environment:', error);
    throw error;
  }
}

export async function importEnvironment(set: SetState, file: File): Promise<Environment> {
  try {
    const environment = await readJSONFile(file) as Environment;

    const res = await fetch(`${API_BASE}/environments/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ environment }),
    });
    if (!res.ok) throw new Error('Failed to import environment');

    await loadEnvironments(set);
    return environment;
  } catch (error) {
    console.error('Failed to import environment:', error);
    throw error;
  }
}

export async function exportEnvironment(environmentId: string): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/environments/${environmentId}/export`);
    if (!res.ok) throw new Error('Failed to export environment');

    const environment: Environment = await res.json();
    const filename = `${environment.name.replace(/[^a-z0-9]/gi, '_')}.requesto-environment.json`;
    downloadJSON(environment, filename);
  } catch (error) {
    console.error('Failed to export environment:', error);
    throw error;
  }
}

/**
 * Persist runtime current-value overrides to the local sidecar file (never
 * committed to git). Also updates the in-memory Zustand state so the UI
 * reflects the new values immediately without a full reload.
 */
export async function updateCurrentValues(
  set: SetState,
  get: GetState,
  envId: string,
  overrides: Record<string, string>,
): Promise<void> {
  const res = await fetch(`${API_BASE}/environments/${envId}/current-values`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ overrides }),
  });
  if (!res.ok) throw new Error('Failed to update current values');

  // Reflect the change in the Zustand store immediately
  const { environmentsData } = get();
  const idx = environmentsData.environments.findIndex((e) => e.id === envId);
  if (idx < 0) return;

  const env = environmentsData.environments[idx];
  const updatedVariables = env.variables.map((v) =>
    Object.prototype.hasOwnProperty.call(overrides, v.key)
      ? { ...v, currentValue: overrides[v.key] }
      : v,
  );
  // Also add any newly-introduced keys as new variables (current-value only)
  Object.entries(overrides).forEach(([key, value]) => {
    if (!updatedVariables.some((v) => v.key === key)) {
      updatedVariables.push({ key, value: '', currentValue: value, enabled: true });
    }
  });

  const updated = [...environmentsData.environments];
  updated[idx] = { ...env, variables: updatedVariables };
  set({ environmentsData: { ...environmentsData, environments: updated } });
}

/**
 * Reset all current-value overrides for an environment back to their initial
 * values. Optionally scope to a single variable key.
 */
export async function resetCurrentValues(
  set: SetState,
  get: GetState,
  envId: string,
  key?: string,
): Promise<void> {
  const url = key
    ? `${API_BASE}/environments/${envId}/current-values?key=${encodeURIComponent(key)}`
    : `${API_BASE}/environments/${envId}/current-values`;
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to reset current values');

  const { environmentsData } = get();
  const idx = environmentsData.environments.findIndex((e) => e.id === envId);
  if (idx < 0) return;

  const env = environmentsData.environments[idx];
  const updatedVariables = key
    ? env.variables.map((v) => (v.key === key ? { ...v, currentValue: undefined } : v))
    : env.variables.map(({ currentValue: _removed, ...rest }) => rest);

  const updated = [...environmentsData.environments];
  updated[idx] = { ...env, variables: updatedVariables };
  set({ environmentsData: { ...environmentsData, environments: updated } });
}
