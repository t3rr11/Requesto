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

  useEffect(() => {
    if (!isRepo) return;

    loadStatus();

    intervalRef.current = setInterval(loadStatus, POLL_INTERVAL);

    const onFocus = () => loadStatus();
    window.addEventListener('focus', onFocus);

    // Listen for data mutations (collection/environment saves)
    const onMutated = () => debouncedLoad();
    window.addEventListener('requesto:data-mutated', onMutated);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('requesto:data-mutated', onMutated);
    };
  }, [isRepo, loadStatus, debouncedLoad]);
}

/**
 * Dispatch after any data mutation (collections, environments, etc.)
 * to trigger a debounced git status refresh.
 */
export function notifyDataMutated(): void {
  window.dispatchEvent(new Event('requesto:data-mutated'));
}
