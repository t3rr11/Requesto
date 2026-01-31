import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const ENVIRONMENTS_FILE = path.join(DATA_DIR, 'environments.json');

export interface EnvironmentVariable {
  key: string;
  value: string;
  enabled: boolean;
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

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize with default environment if file doesn't exist
if (!fs.existsSync(ENVIRONMENTS_FILE)) {
  const defaultData: EnvironmentsData = {
    activeEnvironmentId: 'default',
    environments: [
      {
        id: 'default',
        name: 'Default',
        variables: []
      }
    ]
  };
  fs.writeFileSync(ENVIRONMENTS_FILE, JSON.stringify(defaultData, null, 2));
}

export function getEnvironments(): EnvironmentsData {
  try {
    const data = fs.readFileSync(ENVIRONMENTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to read environments:', error);
    return {
      activeEnvironmentId: null,
      environments: []
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
  
  fs.writeFileSync(ENVIRONMENTS_FILE, JSON.stringify(data, null, 2));
}

export function deleteEnvironment(id: string): boolean {
  const data = getEnvironments();
  const index = data.environments.findIndex(env => env.id === id);
  
  if (index < 0) return false;
  
  // Don't allow deleting the last environment
  if (data.environments.length === 1) return false;
  
  data.environments.splice(index, 1);
  
  // If we deleted the active environment, set a new one
  if (data.activeEnvironmentId === id) {
    data.activeEnvironmentId = data.environments[0]?.id || null;
  }
  
  fs.writeFileSync(ENVIRONMENTS_FILE, JSON.stringify(data, null, 2));
  return true;
}

export function setActiveEnvironment(id: string): boolean {
  const data = getEnvironments();
  const exists = data.environments.some(env => env.id === id);
  
  if (!exists) return false;
  
  data.activeEnvironmentId = id;
  fs.writeFileSync(ENVIRONMENTS_FILE, JSON.stringify(data, null, 2));
  return true;
}

export function getActiveEnvironment(): Environment | null {
  const data = getEnvironments();
  if (!data.activeEnvironmentId) return null;
  
  return data.environments.find(env => env.id === data.activeEnvironmentId) || null;
}

// Substitute variables in a string
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

// Substitute variables in request data
export function substituteInRequest(
  request: { url: string; headers?: Record<string, string>; body?: string },
  environment: Environment | null
): { url: string; headers?: Record<string, string>; body?: string } {
  return {
    url: substituteVariables(request.url, environment),
    headers: request.headers ? 
      Object.fromEntries(
        Object.entries(request.headers).map(([key, value]) => [
          key,
          substituteVariables(value, environment)
        ])
      ) : undefined,
    body: request.body ? substituteVariables(request.body, environment) : undefined
  };
}
