import type { GitCheckResult, GitStatus, GitLogEntry, GitRemote, PullResult, FileDiff } from './types';
import { API_BASE } from '../../helpers/api/config';

type SetState = (partial: Record<string, unknown>) => void;

async function checkGitApi(): Promise<GitCheckResult> {
  const res = await fetch(`${API_BASE}/git/check`);
  if (!res.ok) throw new Error('Failed to check git');
  return res.json();
}

async function getStatusApi(): Promise<GitStatus> {
  const res = await fetch(`${API_BASE}/git/status`);
  if (!res.ok) throw new Error('Failed to get git status');
  return res.json();
}

async function getLogApi(limit = 20): Promise<{ commits: GitLogEntry[] }> {
  const res = await fetch(`${API_BASE}/git/log?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to get git log');
  return res.json();
}

async function getRemotesApi(): Promise<{ remotes: GitRemote[] }> {
  const res = await fetch(`${API_BASE}/git/remotes`);
  if (!res.ok) throw new Error('Failed to get remotes');
  return res.json();
}

async function initRepoApi(): Promise<{ success: boolean; branch: string }> {
  const res = await fetch(`${API_BASE}/git/init`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Init failed' }));
    throw new Error(err.error);
  }
  return res.json();
}

async function commitApi(message: string): Promise<{ success: boolean; commit: string }> {
  const res = await fetch(`${API_BASE}/git/commit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Commit failed' }));
    throw new Error(err.error);
  }
  return res.json();
}

async function pushApi(): Promise<void> {
  const res = await fetch(`${API_BASE}/git/push`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Push failed' }));
    throw new Error(err.error);
  }
}

async function pullApi(): Promise<PullResult> {
  const res = await fetch(`${API_BASE}/git/pull`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Pull failed' }));
    throw new Error(err.error);
  }
  return res.json();
}

async function resolveConflictsApi(strategy: 'ours' | 'theirs', file?: string): Promise<void> {
  const res = await fetch(`${API_BASE}/git/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ strategy, file }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to resolve conflicts' }));
    throw new Error(err.error);
  }
}

async function getDiffApi(file?: string): Promise<{ diffs: FileDiff[] }> {
  const params = file ? `?file=${encodeURIComponent(file)}` : '';
  const res = await fetch(`${API_BASE}/git/diff${params}`);
  if (!res.ok) throw new Error('Failed to get diff');
  return res.json();
}

async function addRemoteApi(name: string, url: string): Promise<void> {
  const res = await fetch(`${API_BASE}/git/remote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, url }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to add remote' }));
    throw new Error(err.error);
  }
}

export async function checkGit(set: SetState): Promise<void> {
  try {
    const result = await checkGitApi();
    set({
      isGitInstalled: result.installed,
      isRepo: result.isRepo,
      branch: result.branch,
    });
  } catch (error) {
    console.error('Failed to check git:', error);
    set({ isGitInstalled: false, isRepo: false, branch: null });
  }
}

export async function loadStatus(set: SetState): Promise<void> {
  set({ statusLoading: true });
  try {
    const status = await getStatusApi();
    set({
      status,
      branch: status.branch,
    });
  } catch (error) {
    console.error('Failed to load git status:', error);
  } finally {
    set({ statusLoading: false });
  }
}

export async function loadLog(set: SetState): Promise<void> {
  try {
    const data = await getLogApi();
    set({ log: data.commits });
  } catch (error) {
    console.error('Failed to load git log:', error);
  }
}

export async function loadRemotes(set: SetState): Promise<void> {
  try {
    const data = await getRemotesApi();
    set({ remotes: data.remotes });
  } catch (error) {
    console.error('Failed to load remotes:', error);
  }
}

export async function initRepo(set: SetState): Promise<void> {
  set({ operating: true });
  try {
    const result = await initRepoApi();
    set({ isRepo: true, branch: result.branch });
    await loadStatus(set);
  } catch (error) {
    console.error('Failed to init repo:', error);
    throw error;
  } finally {
    set({ operating: false });
  }
}

export async function commit(set: SetState, message: string): Promise<string> {
  set({ operating: true });
  try {
    const result = await commitApi(message);
    await loadStatus(set);
    await loadLog(set);
    return result.commit;
  } catch (error) {
    console.error('Failed to commit:', error);
    throw error;
  } finally {
    set({ operating: false });
  }
}

export async function push(set: SetState): Promise<void> {
  set({ pushing: true });
  try {
    await pushApi();
    await loadStatus(set);
  } catch (error) {
    console.error('Failed to push:', error);
    throw error;
  } finally {
    set({ pushing: false });
  }
}

export async function pull(set: SetState): Promise<PullResult> {
  set({ pulling: true });
  try {
    const result = await pullApi();
    if (result.conflicts.length > 0) {
      set({ conflicts: result.conflicts });
    } else {
      set({ conflicts: [] });
    }
    await loadStatus(set);
    await loadLog(set);
    // Notify the app that files on disk may have changed (pull updates data files)
    window.dispatchEvent(new Event('requesto:files-changed'));
    return result;
  } catch (error) {
    console.error('Failed to pull:', error);
    throw error;
  } finally {
    set({ pulling: false });
  }
}

export async function resolveConflicts(
  set: SetState,
  strategy: 'ours' | 'theirs',
  file?: string,
): Promise<void> {
  set({ operating: true });
  try {
    await resolveConflictsApi(strategy, file);
    set({ conflicts: [] });
    await loadStatus(set);
  } catch (error) {
    console.error('Failed to resolve conflicts:', error);
    throw error;
  } finally {
    set({ operating: false });
  }
}

export async function loadDiff(set: SetState, file?: string): Promise<FileDiff[]> {
  set({ diffLoading: true });
  try {
    const data = await getDiffApi(file);
    set({ diffs: data.diffs });
    return data.diffs;
  } catch (error) {
    console.error('Failed to load diff:', error);
    set({ diffs: [] });
    return [];
  } finally {
    set({ diffLoading: false });
  }
}

export async function addRemote(set: SetState, name: string, url: string): Promise<void> {
  set({ operating: true });
  try {
    await addRemoteApi(name, url);
    await loadRemotes(set);
  } catch (error) {
    console.error('Failed to add remote:', error);
    throw error;
  } finally {
    set({ operating: false });
  }
}
