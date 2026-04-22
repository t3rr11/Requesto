const isElectron =
  typeof window !== 'undefined' &&
  (window.location.protocol === 'file:' || !!(window as unknown as Record<string, unknown>).electron);

export const API_BASE = isElectron ? 'http://localhost:4747/api' : '/api';
