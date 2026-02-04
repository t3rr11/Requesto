import { HistoryItem } from '../../store/types';
import { API_BASE } from './config';

/**
 * Get request history
 */
export const getHistory = async (): Promise<HistoryItem[]> => {
  const response = await fetch(`${API_BASE}/history`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch history');
  }
  
  return response.json();
};

/**
 * Clear all history
 */
export const clearHistory = async (): Promise<void> => {
  const response = await fetch(`${API_BASE}/history`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to clear history');
  }
};
