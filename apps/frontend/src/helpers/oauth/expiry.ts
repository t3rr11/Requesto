/**
 * Helpers for displaying OAuth token expiry information based on the
 * non-secret status fetched from the backend.
 */

/** Seconds remaining until `expiresAt`. Null when no expiry is set. */
export function getSecondsUntil(expiresAt: number | undefined | null): number | null {
  if (typeof expiresAt !== 'number') return null;
  return Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
}

/** Human-readable countdown like "in 5m" / "in 2h" / "expired". */
export function formatTimeUntilExpiry(expiresAt: number | undefined | null): string {
  const seconds = getSecondsUntil(expiresAt);
  if (seconds === null) return 'no expiry';
  if (seconds <= 0) return 'expired';
  if (seconds < 60) return `in ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `in ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `in ${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `in ${days}d ${hours % 24}h`;
}
