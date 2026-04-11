import { describe, it, expect, beforeEach } from 'vitest';
import { useThemeStore } from '../../store/theme/store';

describe('theme store', () => {
  beforeEach(() => {
    useThemeStore.setState({ isDarkMode: false });
    document.documentElement.classList.remove('dark');
  });

  it('starts in light mode', () => {
    expect(useThemeStore.getState().isDarkMode).toBe(false);
  });

  it('toggles to dark mode', () => {
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().isDarkMode).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('toggles back to light mode', () => {
    useThemeStore.getState().toggleTheme();
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().isDarkMode).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('sets theme directly', () => {
    useThemeStore.getState().setTheme(true);
    expect(useThemeStore.getState().isDarkMode).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
