type SetState = (partial: Record<string, unknown> | ((state: { isDarkMode: boolean }) => Record<string, unknown>)) => void;

function applyThemeClass(isDark: boolean): void {
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export function toggleTheme(set: SetState): void {
  set((state) => {
    const next = !state.isDarkMode;
    applyThemeClass(next);
    return { isDarkMode: next };
  });
}

export function setTheme(set: SetState, isDark: boolean): void {
  applyThemeClass(isDark);
  set({ isDarkMode: isDark });
}
