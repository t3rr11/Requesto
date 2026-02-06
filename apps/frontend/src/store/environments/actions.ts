import { StoreApi } from 'zustand';
import { Environment, EnvironmentsData } from '../../types';
import { API_BASE } from '../../helpers/api/config';
import {
  importPostmanEnvironment,
  exportEnvironmentToPostman,
  downloadJSON,
  readJSONFile,
} from '../../helpers/postman';

// ============================================================================
// Internal API Helper Functions (integrated from helpers/api/environments.ts)
// ============================================================================

/**
 * Get all environments
 */
async function getEnvironmentsApi(): Promise<EnvironmentsData> {
  const response = await fetch(`${API_BASE}/environments`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch environments');
  }
  
  return response.json();
}

/**
 * Save (create or update) an environment
 */
async function saveEnvironmentApi(environment: Environment): Promise<void> {
  const response = await fetch(`${API_BASE}/environments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(environment),
  });

  if (!response.ok) {
    throw new Error('Failed to save environment');
  }
}

/**
 * Delete an environment
 */
async function deleteEnvironmentApi(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/environments/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete environment');
  }
}

/**
 * Set the active environment
 */
async function setActiveEnvironmentApi(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/environments/active`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id }),
  });

  if (!response.ok) {
    throw new Error('Failed to set active environment');
  }
}

// ============================================================================
// Store Action Implementations
// ============================================================================

interface EnvironmentState {
  environmentsData: EnvironmentsData;
}

type SetState = StoreApi<EnvironmentState>['setState'];
type GetState = StoreApi<EnvironmentState>['getState'];

/**
 * Load all environments from the backend
 */
export const loadEnvironments = async (set: SetState): Promise<void> => {
  try {
    const data = await getEnvironmentsApi();
    set({ environmentsData: data });
  } catch (error) {
    console.error('Failed to load environments:', error);
    throw error;
  }
};

/**
 * Set the active environment
 */
export const setActiveEnvironment = async (
  set: SetState,
  id: string
): Promise<void> => {
  try {
    await setActiveEnvironmentApi(id);
    await loadEnvironments(set);
  } catch (error) {
    console.error('Failed to set active environment:', error);
    throw error;
  }
};

/**
 * Save (create or update) an environment
 */
export const saveEnvironment = async (
  set: SetState,
  get: GetState,
  environment: Environment
): Promise<void> => {
  try {
    await saveEnvironmentApi(environment);

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
};

/**
 * Delete an environment
 */
export const deleteEnvironment = async (
  set: SetState,
  get: GetState,
  id: string
): Promise<void> => {
  try {
    await deleteEnvironmentApi(id);

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
};

// ============================================================================
// Public API Functions (for backwards compatibility with API index exports)
// ============================================================================

/**
 * Get all environments (public API)
 */
export const getEnvironments = getEnvironmentsApi;

/**
 * Save environment (public API)
 */
export const saveEnvironmentPublic = saveEnvironmentApi;

/**
 * Delete environment (public API)
 */
export const deleteEnvironmentPublic = deleteEnvironmentApi;

/**
 * Set active environment (public API)
 */
export const setActiveEnvironmentPublic = setActiveEnvironmentApi;

// ============================================================================
// Import/Export Functions
// ============================================================================

/**
 * Import environment from Postman format
 */
export const importEnvironment = async (
  set: SetState,
  file: File
): Promise<Environment> => {
  try {
    const postmanData = await readJSONFile(file);
    const environment = importPostmanEnvironment(postmanData);
    
    // Send to backend
    const res = await fetch(`${API_BASE}/environments/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ environment }),
    });
    
    if (!res.ok) throw new Error('Failed to import environment');
    
    await loadEnvironments(set);
    return environment;
  } catch (error) {
    console.error('Failed to import environment:', error);
    throw error;
  }
};

/**
 * Export environment to Postman format
 */
export const exportEnvironment = async (environmentId: string): Promise<void> => {
  try {
    const res = await fetch(`${API_BASE}/environments/${environmentId}/export`);
    if (!res.ok) throw new Error('Failed to export environment');
    
    const environment: Environment = await res.json();
    const postmanEnvironment = exportEnvironmentToPostman(environment);
    
    const filename = `${environment.name.replace(/[^a-z0-9]/gi, '_')}.postman_environment.json`;
    downloadJSON(postmanEnvironment, filename);
  } catch (error) {
    console.error('Failed to export environment:', error);
    throw error;
  }
};
