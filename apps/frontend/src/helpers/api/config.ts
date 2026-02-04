// API base URL configuration
// Detect if running in Electron (has window.electron or running on file:// protocol)
const isElectron = typeof window !== 'undefined' && (window.location.protocol === 'file:' || !!(window as any).electron);
// In Electron, use localhost:4000. Otherwise use proxy (/api)
export const API_BASE = isElectron ? 'http://localhost:4000/api' : '/api';
