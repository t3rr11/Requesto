import { app } from 'electron';
import path from 'node:path';

// Load .env.local for local dev overrides — this file is gitignored so
// simulate flags can never be accidentally committed as true.
try {
  process.loadEnvFile(path.join(__dirname, '..', '.env.local'));
} catch {
  // .env.local is optional; ignore if it doesn't exist.
}

export const isDev = !app.isPackaged;
export const BACKEND_PORT = 4747;

// Driven by .env.local — never hardcode true in source.
export const SIMULATE_BACKEND_FAILURE = process.env.SIMULATE_BACKEND_FAILURE === 'true';
export const SIMULATE_UPDATE_AVAILABLE = process.env.SIMULATE_UPDATE_AVAILABLE === 'true';

// Update checks run at startup and again on window focus (throttled), so users
// who never close the app still hear about new releases.
export const UPDATE_CHECKS_ENABLED = !isDev || SIMULATE_UPDATE_AVAILABLE;
export const UPDATE_CHECK_MIN_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
