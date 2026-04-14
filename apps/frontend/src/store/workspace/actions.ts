import type { Workspace, WorkspacesRegistry } from './types';
import { API_BASE } from '../../helpers/api/config';

type SetState = (partial: Record<string, unknown>) => void;
type GetState = () => { registry: WorkspacesRegistry };

async function getWorkspacesApi(): Promise<WorkspacesRegistry> {
  const res = await fetch(`${API_BASE}/workspaces`);
  if (!res.ok) throw new Error('Failed to fetch workspaces');
  return res.json();
}

async function createWorkspaceApi(data: { name: string }): Promise<Workspace> {
  const res = await fetch(`${API_BASE}/workspaces`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to create workspace' }));
    throw new Error(error.error || 'Failed to create workspace');
  }
  return res.json();
}

async function cloneWorkspaceApi(data: { name: string; repoUrl: string; authToken?: string }): Promise<Workspace> {
  const res = await fetch(`${API_BASE}/workspaces/clone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to clone repository' }));
    throw new Error(error.error || 'Failed to clone repository');
  }
  return res.json();
}

async function exportWorkspaceApi(id: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_BASE}/workspaces/${id}/export`);
  if (!res.ok) throw new Error('Failed to export workspace');
  return res.json();
}

async function importWorkspaceApi(bundle: Record<string, unknown>): Promise<Workspace> {
  const res = await fetch(`${API_BASE}/workspaces/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bundle),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to import workspace' }));
    throw new Error(error.error || 'Failed to import workspace');
  }
  return res.json();
}

async function updateWorkspaceApi(id: string, data: { name: string }): Promise<Workspace> {
  const res = await fetch(`${API_BASE}/workspaces/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update workspace');
  return res.json();
}

async function deleteWorkspaceApi(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/workspaces/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to delete workspace' }));
    throw new Error(error.error || 'Failed to delete workspace');
  }
}

async function activateWorkspaceApi(id: string): Promise<Workspace> {
  const res = await fetch(`${API_BASE}/workspaces/${id}/activate`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to activate workspace');
  return res.json();
}

async function openWorkspaceApi(data: { name: string; path: string }): Promise<Workspace> {
  const res = await fetch(`${API_BASE}/workspaces/open`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to open workspace' }));
    throw new Error(error.error || 'Failed to open workspace');
  }
  return res.json();
}

export async function loadWorkspaces(set: SetState): Promise<void> {
  set({ loading: true });
  try {
    const data = await getWorkspacesApi();
    set({ registry: data });
  } catch (error) {
    console.error('Failed to load workspaces:', error);
  } finally {
    set({ loading: false });
  }
}

export async function createWorkspace(
  set: SetState,
  data: { name: string },
): Promise<Workspace> {
  try {
    const workspace = await createWorkspaceApi(data);
    await loadWorkspaces(set);
    return workspace;
  } catch (error) {
    console.error('Failed to create workspace:', error);
    throw error;
  }
}

export async function cloneWorkspace(
  set: SetState,
  data: { name: string; repoUrl: string; authToken?: string },
): Promise<Workspace> {
  try {
    const workspace = await cloneWorkspaceApi(data);
    await loadWorkspaces(set);
    return workspace;
  } catch (error) {
    console.error('Failed to clone workspace:', error);
    throw error;
  }
}

export async function exportWorkspace(id: string): Promise<void> {
  const data = await exportWorkspaceApi(id);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(data.name as string) || 'workspace'}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importWorkspace(
  set: SetState,
  file: File,
): Promise<Workspace> {
  try {
    const text = await file.text();
    const bundle = JSON.parse(text) as Record<string, unknown>;
    const workspace = await importWorkspaceApi(bundle);
    await loadWorkspaces(set);
    return workspace;
  } catch (error) {
    console.error('Failed to import workspace:', error);
    throw error;
  }
}

export async function updateWorkspace(
  set: SetState,
  id: string,
  data: { name: string },
): Promise<Workspace> {
  try {
    const workspace = await updateWorkspaceApi(id, data);
    await loadWorkspaces(set);
    return workspace;
  } catch (error) {
    console.error('Failed to update workspace:', error);
    throw error;
  }
}

export async function deleteWorkspace(
  set: SetState,
  _get: GetState,
  id: string,
): Promise<void> {
  try {
    await deleteWorkspaceApi(id);
    await loadWorkspaces(set);
  } catch (error) {
    console.error('Failed to delete workspace:', error);
    throw error;
  }
}

export async function switchWorkspace(
  set: SetState,
  id: string,
): Promise<Workspace> {
  try {
    const workspace = await activateWorkspaceApi(id);
    await loadWorkspaces(set);
    return workspace;
  } catch (error) {
    console.error('Failed to switch workspace:', error);
    throw error;
  }
}

export async function openWorkspace(
  set: SetState,
  data: { name: string; path: string },
): Promise<Workspace> {
  try {
    const workspace = await openWorkspaceApi(data);
    await loadWorkspaces(set);
    return workspace;
  } catch (error) {
    console.error('Failed to open workspace:', error);
    throw error;
  }
}
