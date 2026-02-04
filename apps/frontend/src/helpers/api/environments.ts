import { EnvironmentsData, Environment } from '../../store/types';
import { API_BASE } from './config';

/**
 * Get all environments
 */
export const getEnvironments = async (): Promise<EnvironmentsData> => {
  const response = await fetch(`${API_BASE}/environments`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch environments');
  }
  
  return response.json();
};

/**
 * Save (create or update) an environment
 */
export const saveEnvironment = async (environment: Environment): Promise<void> => {
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
};

/**
 * Delete an environment
 */
export const deleteEnvironment = async (id: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/environments/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete environment');
  }
};

/**
 * Set the active environment
 */
export const setActiveEnvironment = async (id: string): Promise<void> => {
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
};
