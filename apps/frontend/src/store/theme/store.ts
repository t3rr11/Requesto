import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toggleTheme, setTheme } from './actions';

type ThemeState = {
  isDarkMode: boolean;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDarkMode: false,
      toggleTheme: () => toggleTheme(set),
      setTheme: (isDark) => setTheme(set, isDark),
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        if (state?.isDarkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },
    },
  ),
);
