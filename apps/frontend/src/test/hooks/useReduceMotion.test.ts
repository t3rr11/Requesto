import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { useSettingsStore } from '../../store/settings/store';

describe('useReduceMotion', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('reduce-motion');
    useSettingsStore.setState({ reduceMotion: false });
  });

  it('toggles the reduce-motion class on the document root with the setting', () => {
    renderHook(() => useReduceMotion());
    expect(document.documentElement.classList.contains('reduce-motion')).toBe(false);

    act(() => useSettingsStore.getState().setReduceMotion(true));
    expect(document.documentElement.classList.contains('reduce-motion')).toBe(true);

    act(() => useSettingsStore.getState().setReduceMotion(false));
    expect(document.documentElement.classList.contains('reduce-motion')).toBe(false);
  });

  it('removes the class when unmounted', () => {
    useSettingsStore.setState({ reduceMotion: true });
    const { unmount } = renderHook(() => useReduceMotion());
    expect(document.documentElement.classList.contains('reduce-motion')).toBe(true);
    unmount();
    expect(document.documentElement.classList.contains('reduce-motion')).toBe(false);
  });
});
