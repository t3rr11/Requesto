import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as actions from './actions';
import type { Settings } from './types';

type SettingsState = Settings & {
  setInsecureTls: (value: boolean) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      insecureTls: false,
      setInsecureTls: (value) => actions.setInsecureTls(set, value),
    }),
    {
      name: 'requesto-settings-storage',
    },
  ),
);
