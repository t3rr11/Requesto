import { create } from 'zustand';
import { API_BASE } from '../helpers/api/config';

export interface EnvironmentVariable {
  key: string;
  value: string;
  enabled: boolean;
  isSecret?: boolean;
}

export interface Environment {
  id: string;
  name: string;
  variables: EnvironmentVariable[];
}

export interface EnvironmentsData {
  activeEnvironmentId: string | null;
  environments: Environment[];
}

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

  setEnvironmentsData: data => set({ environmentsData: data }),

  loadEnvironments: async () => {
    try {
      const res = await fetch(`${API_BASE}/environments`);
      if (res.ok) {
        const data = await res.json();
        set({ environmentsData: data });
      }
    } catch (error) {
      console.error('Failed to load environments:', error);
    }
  },

  setActiveEnvironment: async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/environments/active`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        await get().loadEnvironments();
      }
    } catch (error) {
      console.error('Failed to set active environment:', error);
      throw error;
    }
  },

  saveEnvironment: async (environment: Environment) => {
    try {
      const res = await fetch(`${API_BASE}/environments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(environment),
      });

      if (!res.ok) {
        throw new Error('Failed to save environment');
      }

      // Update local state
      const { environmentsData } = get();
      const existingIndex = environmentsData.environments.findIndex(e => e.id === environment.id);

      if (existingIndex >= 0) {
        const updated = [...environmentsData.environments];
        updated[existingIndex] = environment;
        set({ environmentsData: { ...environmentsData, environments: updated } });
      } else {
        set({
          environmentsData: {
            ...environmentsData,
            environments: [...environmentsData.environments, environment],
          },
        });
      }
    } catch (error) {
      console.error('Failed to save environment:', error);
      throw error;
    }
  },

  deleteEnvironment: async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/environments/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete environment');
      }

      // Update local state
      const { environmentsData } = get();
      const remaining = environmentsData.environments.filter(e => e.id !== id);
      set({
        environmentsData: {
          ...environmentsData,
          environments: remaining,
          activeEnvironmentId: environmentsData.activeEnvironmentId === id ? null : environmentsData.activeEnvironmentId,
        },
      });
    } catch (error) {
      console.error('Failed to delete environment:', error);
      throw error;
    }
  },

  addEnvironment: (environment: Environment) => {
    const { environmentsData } = get();
    set({
      environmentsData: {
        ...environmentsData,
        environments: [...environmentsData.environments, environment],
      },
    });
  },

  updateEnvironment: (environment: Environment) => {
    const { environmentsData } = get();
    const existingIndex = environmentsData.environments.findIndex(e => e.id === environment.id);

    if (existingIndex >= 0) {
      const updated = [...environmentsData.environments];
      updated[existingIndex] = environment;
      set({ environmentsData: { ...environmentsData, environments: updated } });
    }
  },
}));
