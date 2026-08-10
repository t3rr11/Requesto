import fs from 'node:fs';
import path from 'node:path';
import type {
  Collection,
  Environment,
  EnvironmentVariable,
  EnvironmentsData,
  OAuthToken,
  RunnerConfig,
} from './types';

export interface RequestoData {
  collections: Collection[];
  environmentsData: EnvironmentsData;
  oauthTokens: Record<string, OAuthToken>;
  runnerConfig: RunnerConfig;
  requestoDir: string;
}

function readJson<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch {
    return null;
  }
}

/** Walk up from startDir until a .requesto directory is found. */
export function findRequestoDir(startDir: string = process.cwd()): string | null {
  let dir = startDir;
  while (true) {
    const candidate = path.join(dir, '.requesto');
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function mergeLocalOverrides(
  environments: Environment[],
  localData: Record<string, Record<string, string>>,
): Environment[] {
  return environments.map((env) => {
    const overrides = localData[env.id];
    if (!overrides) return env;
    return {
      ...env,
      variables: env.variables.map((v) =>
        Object.hasOwn(overrides, v.key)
          ? { ...v, currentValue: overrides[v.key] }
          : v,
      ),
    };
  });
}

/** Apply REQUESTO_VAR_<key>=value OS env vars as currentValue overrides. */
export function applyOsEnvOverrides(variables: EnvironmentVariable[]): EnvironmentVariable[] {
  return variables.map((v) => {
    const osValue = process.env[`REQUESTO_VAR_${v.key}`];
    return osValue !== undefined ? { ...v, currentValue: osValue } : v;
  });
}

export function loadRequestoData(requestoDir: string): RequestoData {
  const repoRoot = path.dirname(requestoDir);
  const localDir = path.join(repoRoot, '.requesto.local');

  const collections = readJson<Collection[]>(path.join(requestoDir, 'collections.json')) ?? [];

  const environmentsData: EnvironmentsData = readJson<EnvironmentsData>(
    path.join(requestoDir, 'environments.json'),
  ) ?? { activeEnvironmentId: null, environments: [] };

  // Merge runtime currentValues from .requesto.local/environments.local.json
  const localOverrides = readJson<Record<string, Record<string, string>>>(
    path.join(localDir, 'environments.local.json'),
  ) ?? {};
  environmentsData.environments = mergeLocalOverrides(environmentsData.environments, localOverrides);

  // Apply REQUESTO_VAR_* OS env vars (highest priority)
  environmentsData.environments = environmentsData.environments.map((env) => ({
    ...env,
    variables: applyOsEnvOverrides(env.variables),
  }));

  const oauthTokens = readJson<Record<string, OAuthToken>>(
    path.join(localDir, 'oauth-tokens.json'),
  ) ?? {};

  const runnerConfig = readJson<RunnerConfig>(path.join(requestoDir, 'runner.json')) ?? {};

  return { collections, environmentsData, oauthTokens, runnerConfig, requestoDir };
}

export function resolveEnvironment(data: EnvironmentsData, nameOrId?: string): Environment | null {
  const { environments, activeEnvironmentId } = data;
  if (!environments.length) return null;

  if (nameOrId) {
    const found = environments.find((e) => e.name === nameOrId || e.id === nameOrId);
    if (!found) {
      throw new Error(
        `Environment "${nameOrId}" not found. Available: ${environments.map((e) => e.name).join(', ')}`,
      );
    }
    return found;
  }

  if (activeEnvironmentId) {
    const found = environments.find((e) => e.id === activeEnvironmentId);
    if (found) return found;
  }

  return environments[0] ?? null;
}

export function resolveCollection(
  collections: Collection[],
  nameOrId?: string,
): Collection {
  if (!collections.length) {
    throw new Error('No collections found in .requesto/collections.json');
  }

  if (nameOrId) {
    const found = collections.find((c) => c.name === nameOrId || c.id === nameOrId);
    if (!found) {
      throw new Error(
        `Collection "${nameOrId}" not found. Available: ${collections.map((c) => c.name).join(', ')}`,
      );
    }
    return found;
  }

  if (collections.length === 1) return collections[0];

  throw new Error(
    `Multiple collections found. Specify one with --collection or the "collection" field in runner.json.\n` +
    `Available: ${collections.map((c) => c.name).join(', ')}`,
  );
}
