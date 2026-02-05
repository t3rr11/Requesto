import { create } from 'zustand';
import { Environment, EnvironmentsData } from '../../types';
import * as actions from './actions';

interface EnvironmentState {
  environmentsData: EnvironmentsData;

  // Actions
  setEnvironmentsData: (data: EnvironmentsData) => void;
  loadEnvironments: () => Promise<void>;
  setActiveEnvironment: (id: string) => Promise<void>;
  saveEnvironment: (environment: Environment) => Promise<void>;
  deleteEnvironment: (id: string) => Promise<void>;
  addEnvironment: (environment: Environment) => void;
  updateEnvironment: (environment: Environment) => void;
}

export const useEnvironmentStore = create<EnvironmentState>((set, get) => ({
  environmentsData: {
    activeEnvironmentId: null,
    environments: [],
  },

  setEnvironmentsData: (data) => set({ environmentsData: data }),

  // Action implementations
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
    const existingIndex = environmentsData.environments.findIndex(e => e.id === environment.id);

    if (existingIndex >= 0) {
      const updated = [...environmentsData.environments];
      updated[existingIndex] = environment;
      set({ environmentsData: { ...environmentsData, environments: updated } });
    }
  },
}));
