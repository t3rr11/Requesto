import { Environment, EnvironmentVariable } from '../types';
import { AuthConfig } from '../types';

/**
 * Substitute environment variables in a string
 * Replaces {{variableName}} with the actual value from the active environment
 */
export function substituteVariables(text: string, environment: Environment | null): string {
  if (!environment || !text) return text;

  let result = text;
  
  environment.variables.forEach((variable: EnvironmentVariable) => {
    if (variable.enabled && variable.key) {
      // Match {{variableName}} or {{ variableName }} (with optional spaces)
      const pattern = new RegExp(`{{\\s*${escapeRegExp(variable.key)}\\s*}}`, 'g');
      result = result.replace(pattern, variable.value || '');
    }
  });

  return result;
}

/**
 * Substitute variables in all request fields
 */
export function substituteInRequest(
  request: { 
    method: string;
    url: string; 
    headers?: Record<string, string>; 
    body?: string;
    auth?: AuthConfig;
  },
  environment: Environment | null
): { 
  method: string;
  url: string; 
  headers?: Record<string, string>; 
  body?: string;
  auth?: AuthConfig;
} {
  if (!environment) return request;

  return {
    method: request.method,
    url: substituteVariables(request.url, environment),
    headers: request.headers
      ? Object.fromEntries(
          Object.entries(request.headers).map(([key, value]) => [
            key,
            substituteVariables(value, environment),
          ])
        )
      : undefined,
    body: request.body ? substituteVariables(request.body, environment) : undefined,
    auth: request.auth, // Preserve auth config
  };
}

/**
 * Extract variable names from text (finds all {{variableName}} patterns)
 */
export function extractVariableNames(text: string): string[] {
  if (!text) return [];
  
  const pattern = /{{\\s*([a-zA-Z0-9_-]+)\\s*}}/g;
  const matches = text.matchAll(pattern);
  const variables = Array.from(matches, match => match[1]);
  
  return [...new Set(variables)]; // Remove duplicates
}

/**
 * Check if a string contains any variable placeholders
 */
export function hasVariables(text: string): boolean {
  if (!text) return false;
  return /{{\\s*[a-zA-Z0-9_-]+\\s*}}/.test(text);
}

/**
 * Get all undefined variables used in a request
 */
export function getUndefinedVariables(
  request: { method: string; url: string; headers?: Record<string, string>; body?: string; auth?: any },
  environment: Environment | null
): string[] {
  const usedVariables = new Set<string>();
  
  // Extract from URL
  extractVariableNames(request.url).forEach(v => usedVariables.add(v));
  
  // Extract from headers
  if (request.headers) {
    Object.values(request.headers).forEach(value => {
      extractVariableNames(value).forEach(v => usedVariables.add(v));
    });
  }
  
  // Extract from body
  if (request.body) {
    extractVariableNames(request.body).forEach(v => usedVariables.add(v));
  }
  
  if (!environment) return Array.from(usedVariables);
  
  // Filter out defined variables
  const definedVariables = new Set(
    environment.variables
      .filter(v => v.enabled && v.key)
      .map(v => v.key)
  );
  
  return Array.from(usedVariables).filter(v => !definedVariables.has(v));
}

/**
 * Escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Generates a new unique environment ID
 */
export const generateEnvironmentId = (): string => {
  return `env-${Date.now()}`;
};

/**
 * Creates a new environment object with default values
 */
export const createNewEnvironment = (name: string = 'New Environment'): Environment => {
  return {
    id: generateEnvironmentId(),
    name,
    variables: [],
  };
};

/**
 * Duplicates an existing environment with a new ID
 */
export const duplicateEnvironment = (env: Environment, nameSuffix: string = 'Copy'): Environment => {
  return {
    id: generateEnvironmentId(),
    name: `${env.name} ${nameSuffix}`,
    variables: env.variables.map(v => ({ ...v })),
  };
};

/**
 * Validates environment form data
 */
export const validateEnvironment = (env: Partial<Environment>): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!env.name || env.name.trim() === '') {
    errors.push('Environment name is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Filters out empty variables (variables with no key)
 */
export const filterValidVariables = (variables: EnvironmentVariable[]): EnvironmentVariable[] => {
  return variables.filter(v => v.key.trim() !== '');
};

/**
 * Prepares environment data for saving
 */
export const prepareEnvironmentForSave = (env: Environment): Environment => {
  return {
    ...env,
    name: env.name.trim(),
    variables: filterValidVariables(env.variables),
  };
};

/**
 * Creates a default empty variable
 */
export const createEmptyVariable = (): EnvironmentVariable => {
  return {
    key: '',
    value: '',
    enabled: true,
    isSecret: false,
  };
};
