import { StoreApi } from 'zustand';

type SetState = StoreApi<any>['setState'];

export const toggleTheme = (set: SetState) => {
  set((state: any) => {
    const newDarkMode = !state.isDarkMode;
    // Update the document class
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    return { isDarkMode: newDarkMode };
  });
};

export const setTheme = (set: SetState, isDark: boolean) => {
  set(() => {
    // Update the document class
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    return { isDarkMode: isDark };
  });
};
