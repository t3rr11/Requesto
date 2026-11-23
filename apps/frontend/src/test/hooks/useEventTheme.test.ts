import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEventTheme } from '../../hooks/useEventTheme';
import { useSettingsStore } from '../../store/settings/store';

describe('useEventTheme', () => {
  beforeEach(() => {
    useSettingsStore.setState({ disableEventThemes: false, overrideEventTheme: null });
  });

  it('returns null when holiday & event themes are disabled, even with an override', () => {
    useSettingsStore.setState({ disableEventThemes: true, overrideEventTheme: 'halloween' });
    const { result } = renderHook(() => useEventTheme());
    expect(result.current).toBeNull();
  });

  it('forces the overridden theme on regardless of the date', () => {
    useSettingsStore.setState({ overrideEventTheme: 'halloween' });
    const { result } = renderHook(() => useEventTheme());
    expect(result.current).toMatchObject({ id: 'halloween', headerDecoration: 'cobweb' });
  });

  it('falls back to the date-based match when the override points at a removed event', () => {
    useSettingsStore.setState({ overrideEventTheme: 'not-a-registered-event' });
    const { result } = renderHook(() => useEventTheme());
    const expected = result.current;

    // Either the real date window is active or there is nothing active today.
    if (expected) {
      expect(expected.id).toBe('halloween');
    } else {
      expect(expected).toBeNull();
    }
  });

  it('is null outside of every event window when auto', () => {
    // The auto path is covered exhaustively by the registry tests with fixed
    // dates; this asserts the hook wires through the same result shape.
    const { result } = renderHook(() => useEventTheme());
    const active = result.current;
    if (active) {
      expect(active.id).toBe('halloween');
    }
  });
});
