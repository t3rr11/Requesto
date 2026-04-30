import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGitAutoRefresh, notifyDataMutated } from '../../hooks/useGitAutoRefresh';
import { useGitStore } from '../../store/git/store';

vi.useFakeTimers();

describe('useGitAutoRefresh', () => {
  const mockLoadStatus = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    useGitStore.setState({
      isRepo: false,
      loadStatus: mockLoadStatus,
    } as any);
  });

  it('does nothing when not a repo', () => {
    renderHook(() => useGitAutoRefresh());

    expect(mockLoadStatus).not.toHaveBeenCalled();
  });

  it('calls loadStatus immediately when isRepo becomes true', () => {
    useGitStore.setState({ isRepo: true } as any);

    renderHook(() => useGitAutoRefresh());

    expect(mockLoadStatus).toHaveBeenCalledOnce();
  });

  it('polls status every 60 seconds', () => {
    useGitStore.setState({ isRepo: true } as any);

    renderHook(() => useGitAutoRefresh());

    expect(mockLoadStatus).toHaveBeenCalledTimes(1); // initial call

    act(() => { vi.advanceTimersByTime(60_000); });
    expect(mockLoadStatus).toHaveBeenCalledTimes(2);

    act(() => { vi.advanceTimersByTime(60_000); });
    expect(mockLoadStatus).toHaveBeenCalledTimes(3);
  });

  it('debounces data-mutated events', () => {
    useGitStore.setState({ isRepo: true } as any);

    renderHook(() => useGitAutoRefresh());
    mockLoadStatus.mockClear();

    // Fire multiple mutation events rapidly
    act(() => {
      window.dispatchEvent(new Event('requesto:data-mutated'));
      window.dispatchEvent(new Event('requesto:data-mutated'));
      window.dispatchEvent(new Event('requesto:data-mutated'));
    });

    // Not called yet (debounced)
    expect(mockLoadStatus).not.toHaveBeenCalled();

    // After debounce period
    act(() => { vi.advanceTimersByTime(2_000); });
    expect(mockLoadStatus).toHaveBeenCalledOnce();
  });

  it('cleans up intervals and listeners on unmount', () => {
    useGitStore.setState({ isRepo: true } as any);

    const { unmount } = renderHook(() => useGitAutoRefresh());
    mockLoadStatus.mockClear();

    unmount();

    act(() => { vi.advanceTimersByTime(30_000); });
    act(() => { window.dispatchEvent(new Event('focus')); });

    expect(mockLoadStatus).not.toHaveBeenCalled();
  });
});

describe('notifyDataMutated', () => {
  it('dispatches requesto:data-mutated event', () => {
    const spy = vi.spyOn(window, 'dispatchEvent');

    notifyDataMutated();

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ type: 'requesto:data-mutated' }));
    spy.mockRestore();
  });
});
