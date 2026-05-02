import { create } from 'zustand';
import type { Environment, EnvironmentsData } from './types';
import * as actions from './actions';

type EnvironmentState = {
  environmentsData: EnvironmentsData;
  loading: boolean;

  loadEnvironments: () => Promise<void>;
  setActiveEnvironment: (id: string) => Promise<void>;
  saveEnvironment: (environment: Environment) => Promise<void>;
  deleteEnvironment: (id: string) => Promise<void>;
  addEnvironment: (environment: Environment) => void;
  updateEnvironment: (environment: Environment) => void;
  importEnvironment: (file: File) => Promise<Environment>;
  exportEnvironment: (environmentId: string) => Promise<void>;
  updateCurrentValues: (envId: string, overrides: Record<string, string>) => Promise<void>;
  resetCurrentValues: (envId: string, key?: string) => Promise<void>;
};

export const useEnvironmentStore = create<EnvironmentState>((set, get) => ({
  environmentsData: { activeEnvironmentId: null, environments: [] },
  loading: false,

  loadEnvironments: () => actions.loadEnvironments(set),
  setActiveEnvironment: (id) => actions.setActiveEnvironment(set, id),
  saveEnvironment: (environment) => actions.saveEnvironment(set, get, environment),
  deleteEnvironment: (id) => actions.deleteEnvironment(set, get, id),

  addEnvironment: (environment) => {
    const { environmentsData } = get();
    set({
      environmentsData: {
        ...environmentsData,
        environments: [...environmentsData.environments, environment],
      },
    });
  },

  updateEnvironment: (environment) => {
    const { environmentsData } = get();
    const idx = environmentsData.environments.findIndex((e) => e.id === environment.id);
    if (idx < 0) return;
    const updated = [...environmentsData.environments];
    updated[idx] = environment;
    set({ environmentsData: { ...environmentsData, environments: updated } });
  },

  importEnvironment: (file) => actions.importEnvironment(set, file),
  exportEnvironment: (environmentId) => actions.exportEnvironment(environmentId),
  updateCurrentValues: (envId, overrides) => actions.updateCurrentValues(set, get, envId, overrides),
  resetCurrentValues: (envId, key) => actions.resetCurrentValues(set, get, envId, key),
}));
