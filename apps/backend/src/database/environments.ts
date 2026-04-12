import fs from 'fs';
import path from 'path';
import { initializeFile, atomicWrite } from './storage';
import { FormDataEntry } from '../types';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const ENVIRONMENTS_FILE = path.join(DATA_DIR, 'environments.json');

export interface EnvironmentVariable {
  key: string;
  value: string;
  enabled: boolean;
  isSecret?: boolean;
}

export interface Environment {
  id: string;
  name: string;
  variables: EnvironmentVariable[];
}

interface EnvironmentsData {
  activeEnvironmentId: string | null;
  environments: Environment[];
}

initializeFile(ENVIRONMENTS_FILE, {
  activeEnvironmentId: 'default',
  environments: [
    {
      id: 'default',
      name: 'Default',
      variables: [],
    },
  ],
} as EnvironmentsData);

export function getEnvironments(): EnvironmentsData {
  try {
    const data = fs.readFileSync(ENVIRONMENTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to read environments:', error);
    return {
      activeEnvironmentId: null,
      environments: [],
    };
  }
}

export function saveEnvironment(environment: Environment): void {
  const data = getEnvironments();
  const index = data.environments.findIndex(env => env.id === environment.id);

  if (index >= 0) {
    data.environments[index] = environment;
  } else {
    data.environments.push(environment);
  }

  atomicWrite(ENVIRONMENTS_FILE, data);
}

export function deleteEnvironment(id: string): boolean {
  const data = getEnvironments();
  const index = data.environments.findIndex(env => env.id === id);

  if (index < 0) return false;
  if (data.environments.length === 1) return false;

  data.environments.splice(index, 1);

  if (data.activeEnvironmentId === id) {
    data.activeEnvironmentId = data.environments[0]?.id || null;
  }

  atomicWrite(ENVIRONMENTS_FILE, data);
  return true;
}

export function setActiveEnvironment(id: string): boolean {
  const data = getEnvironments();
  const exists = data.environments.some(env => env.id === id);

  if (!exists) return false;

  data.activeEnvironmentId = id;
  atomicWrite(ENVIRONMENTS_FILE, data);
  return true;
}

export function getActiveEnvironment(): Environment | null {
  const data = getEnvironments();
  if (!data.activeEnvironmentId) return null;

  return data.environments.find(env => env.id === data.activeEnvironmentId) || null;
}

export function substituteVariables(text: string, environment: Environment | null): string {
  if (!environment) return text;

  let result = text;
  environment.variables.forEach(variable => {
    if (variable.enabled) {
      const pattern = new RegExp(`{{\\s*${variable.key}\\s*}}`, 'g');
      result = result.replace(pattern, variable.value);
    }
  });

  return result;
}

interface RequestData {
  url: string;
  headers?: Record<string, string>;
  body?: string;
  formDataEntries?: FormDataEntry[];
}
export function substituteInRequest(request: RequestData, environment: Environment | null) {
  return {
    url: substituteVariables(request.url, environment),
    headers: request.headers
      ? Object.fromEntries(
          Object.entries(request.headers).map(([key, value]) => [key, substituteVariables(value, environment)])
        )
      : undefined,
    body: request.body ? substituteVariables(request.body, environment) : undefined,
    formDataEntries: request.formDataEntries
      ? request.formDataEntries.map(entry => ({
          ...entry,
          key: substituteVariables(entry.key, environment),
          value: entry.type === 'text' ? substituteVariables(entry.value, environment) : entry.value,
        }))
      : undefined,
  };
}
