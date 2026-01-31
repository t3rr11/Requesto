import { create } from 'zustand';

export interface EnvironmentVariable {
  key: string;
  value: string;
  enabled: boolean;
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
  environmentChangeCounter: number;
  
  // Actions
  setEnvironmentsData: (data: EnvironmentsData) => void;
  incrementEnvironmentCounter: () => void;
  loadEnvironments: () => Promise<void>;
  setActiveEnvironment: (id: string) => Promise<void>;
}

export const useEnvironmentStore = create<EnvironmentState>((set, get) => ({
  environmentsData: {
    activeEnvironmentId: null,
    environments: [],
  },
  environmentChangeCounter: 0,
  
  setEnvironmentsData: (data) => set({ environmentsData: data }),
  
  incrementEnvironmentCounter: () => set((state) => ({ 
    environmentChangeCounter: state.environmentChangeCounter + 1 
  })),
  
  loadEnvironments: async () => {
    try {
      const res = await fetch('/api/environments');
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
      const res = await fetch('/api/environments/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      
      if (res.ok) {
        await get().loadEnvironments();
        get().incrementEnvironmentCounter();
      }
    } catch (error) {
      console.error('Failed to set active environment:', error);
    }
  },
}));
