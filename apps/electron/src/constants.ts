import { app } from 'electron';

export const isDev = !app.isPackaged;
export const BACKEND_PORT = 4747;

// Set to true to test the error window without a real backend failure.
export const SIMULATE_BACKEND_FAILURE = false;

// Set to true to test the update notification UI in dev mode.
export const SIMULATE_UPDATE_AVAILABLE = false;
