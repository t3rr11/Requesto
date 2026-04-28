import { useEffect, useRef, useCallback } from 'react';
import { useGitStore } from '../store/git/store';

const POLL_INTERVAL = 15_000; // 15 seconds
const DEBOUNCE_MS = 2_000; // debounce mutation-triggered refreshes

/**
 * Polls git status periodically and on window focus.
 * Only active when the workspace is a git repo.
 * Also listens for custom 'requesto:data-mutated' events.
 */
export function useGitAutoRefresh() {
  const { isRepo, loadStatus } = useGitStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedLoad = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(loadStatus, DEBOUNCE_MS);
  }, [loadStatus]);

  const startPolling = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(loadStatus, POLL_INTERVAL);
  }, [loadStatus]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isRepo) return;

    loadStatus();
    startPolling();

    // In Electron, use IPC-based focus/blur from the main process (reliable).
    // In the browser, fall back to the Page Visibility API.
    let cleanupFocusBlur: (() => void) | null = null;
    if (window.electronAPI?.onWindowFocus && window.electronAPI?.onWindowBlur) {
      const removeFocus = window.electronAPI.onWindowFocus(() => {
        loadStatus();
        startPolling();
      });
      const removeBlur = window.electronAPI.onWindowBlur(() => stopPolling());
      cleanupFocusBlur = () => { removeFocus(); removeBlur(); };
    } else {
      const onVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          loadStatus();
          startPolling();
        } else {
          stopPolling();
        }
      };
      document.addEventListener('visibilitychange', onVisibilityChange);
      cleanupFocusBlur = () => document.removeEventListener('visibilitychange', onVisibilityChange);
    }

    // Listen for data mutations (collection/environment saves)
    const onMutated = () => debouncedLoad();
    window.addEventListener('requesto:data-mutated', onMutated);

    return () => {
      stopPolling();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      cleanupFocusBlur?.();
      window.removeEventListener('requesto:data-mutated', onMutated);
    };
  }, [isRepo, loadStatus, debouncedLoad, startPolling, stopPolling]);
}

/**
 * Dispatch after any data mutation (collections, environments, etc.)
 * to trigger a debounced git status refresh.
 */
export function notifyDataMutated(): void {
  window.dispatchEvent(new Event('requesto:data-mutated'));
}
