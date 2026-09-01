import type { Environment } from 'requesto-engine';
import { CliError } from './cli-error.ts';

/**
 * Normalise a variable/config key for environment-variable lookups:
 * `my-app:clientId` → `MY_APP_CLIENTID`.
 */
export function normalizeKey(key: string): string {
  return key.replace(/[^A-Za-z0-9_]/g, '_').toUpperCase();
}

/**
 * Parse `key=value` CLI pairs (used by --var, --token, --oauth-secret,
 * --refresh-token). Splits on the first `=` only.
 */
export function parseKeyValuePairs(pairs: string[] | undefined): Map<string, string> {
  const map = new Map<string, string>();
  for (const pair of pairs ?? []) {
    const eq = pair.indexOf('=');
    if (eq <= 0) {
      throw new CliError(`Expected "key=value" but got "${pair}"`);
    }
    map.set(pair.slice(0, eq).trim(), pair.slice(eq + 1));
  }
  return map;
}

/** Parse a `.env` file body: KEY=VALUE lines, `#` comments, quotes trimmed, `export ` prefix allowed. */
export function parseEnvFile(content: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const body = line.startsWith('export ') ? line.slice(7).trim() : line;
    const eq = body.indexOf('=');
    if (eq <= 0) continue;
    const key = body.slice(0, eq).trim();
    let value = body.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }
    map.set(key, value);
  }
  return map;
}

/** Collect all `process.env` entries starting with `prefix` into a Map (values as-is). */
export function collectEnvVars(prefix: string): Map<string, string> {
  const map = new Map<string, string>();
  const normalisedPrefix = normalizeKey(prefix);
  for (const [key, value] of Object.entries(process.env)) {
    if (value === undefined) continue;
    if (normalizeKey(key).startsWith(normalisedPrefix) && normalizeKey(key).length > normalisedPrefix.length) {
      map.set(key, value);
    }
  }
  return map;
}

/**
 * Build a lookup of override values keyed by *normalised* key so that
 * `REQUESTO_TOKEN_my-app-auth` matches config id `my-app:auth` / `my-app-auth`.
 * Accepts the raw-keyed Map from flags directly: flag keys are normalised too.
 */
export function toNormalisedMap(map: Map<string, string>): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of map) {
    out.set(normalizeKey(key), value);
  }
  return out;
}

/**
 * Merge variable overrides onto an environment. Existing variables get their
 * `currentValue` replaced (exact key match wins, then case-insensitive
 * normalised match); unknown keys are appended as new enabled variables.
 * Returns the original reference when there is nothing to override.
 */
export function applyVarOverrides(
  env: Environment | null,
  overrides: Map<string, string>,
): Environment | null {
  if (overrides.size === 0) return env;

  const normalised = toNormalisedMap(overrides);
  const base: Environment = env ?? { id: 'cli-vars', name: 'CLI variables', variables: [] };
  const used = new Set<string>();

  const variables = base.variables.map((v) => {
    if (overrides.has(v.key)) {
      used.add(v.key);
      return { ...v, currentValue: overrides.get(v.key) };
    }
    const normalisedMatch = [...normalised.entries()].find(([key]) => normalizeKey(v.key) === key);
    if (normalisedMatch) {
      used.add(normalisedMatch[0]);
      return { ...v, currentValue: normalisedMatch[1] };
    }
    return v;
  });

  for (const [key, value] of overrides) {
    if (used.has(key) || used.has(normalizeKey(key))) continue;
    variables.push({ key, value, currentValue: value, enabled: true });
  }

  return { ...base, variables };
}
