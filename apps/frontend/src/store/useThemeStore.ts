import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  isDarkMode: boolean;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDarkMode: false,
      toggleTheme: () =>
        set((state) => {
          const newDarkMode = !state.isDarkMode;
          console.log('Toggling theme:', { from: state.isDarkMode, to: newDarkMode });
          // Update the document class
          if (newDarkMode) {
            document.documentElement.classList.add('dark');
            console.log('Added dark class to html element');
          } else {
            document.documentElement.classList.remove('dark');
            console.log('Removed dark class from html element');
          }
          console.log('HTML classes:', document.documentElement.className);
          return { isDarkMode: newDarkMode };
        }),
      setTheme: (isDark: boolean) =>
        set(() => {
          // Update the document class
          if (isDark) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
          return { isDarkMode: isDark };
        }),
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        // Apply theme on page load
        if (state?.isDarkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },
    }
  )
);
