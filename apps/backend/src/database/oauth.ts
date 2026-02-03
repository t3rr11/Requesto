/**
 * OAuth Configuration Storage
 * Handles persistence of OAuth configurations on the backend
 */

import fs from 'fs';
import path from 'path';
import { OAuthConfigServer } from '../types';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const OAUTH_FILE = path.join(DATA_DIR, 'oauth-configs.json');

interface OAuthData {
  configs: OAuthConfigServer[];
}

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize OAuth config file if it doesn't exist
if (!fs.existsSync(OAUTH_FILE)) {
  const initialData: OAuthData = { configs: [] };
  fs.writeFileSync(OAUTH_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
}

/**
 * Read OAuth configurations from disk
 */
function readOAuthData(): OAuthData {
  try {
    const data = fs.readFileSync(OAUTH_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading OAuth configs:', error);
    return { configs: [] };
  }
}

/**
 * Write OAuth configurations to disk
 */
function writeOAuthData(data: OAuthData): void {
  try {
    fs.writeFileSync(OAUTH_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing OAuth configs:', error);
    throw error;
  }
}

/**
 * Get all OAuth configurations
 * Note: Returns configs WITHOUT clientSecret for security
 */
export function getAllConfigs(): Omit<OAuthConfigServer, 'clientSecret'>[] {
  const data = readOAuthData();
  
  // Remove clientSecret from response
  return data.configs.map(({ clientSecret, ...config }) => config);
}

/**
 * Get a specific OAuth configuration by ID
 * @param id - The config ID
 * @param includeSecret - Whether to include the client secret (default: false)
 */
export function getConfig(
  id: string,
  includeSecret: boolean = false
): OAuthConfigServer | Omit<OAuthConfigServer, 'clientSecret'> | null {
  const data = readOAuthData();
  const config = data.configs.find(c => c.id === id);
  
  if (!config) {
    return null;
  }
  
  if (includeSecret) {
    return config;
  }
  
  // Remove clientSecret
  const { clientSecret, ...configWithoutSecret } = config;
  return configWithoutSecret;
}

/**
 * Create a new OAuth configuration
 */
export function createConfig(
  configData: Omit<OAuthConfigServer, 'id' | 'createdAt' | 'updatedAt'>
): OAuthConfigServer {
  const data = readOAuthData();
  
  const newConfig: OAuthConfigServer = {
    ...configData,
    id: `oauth-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  data.configs.push(newConfig);
  writeOAuthData(data);
  
  // Return without client secret
  const { clientSecret, ...configWithoutSecret } = newConfig;
  return configWithoutSecret as OAuthConfigServer;
}

/**
 * Update an existing OAuth configuration
 */
export function updateConfig(
  id: string,
  updates: Partial<Omit<OAuthConfigServer, 'id' | 'createdAt'>>
): OAuthConfigServer | null {
  const data = readOAuthData();
  const index = data.configs.findIndex(c => c.id === id);
  
  if (index === -1) {
    return null;
  }
  
  data.configs[index] = {
    ...data.configs[index],
    ...updates,
    id, // Ensure ID doesn't change
    updatedAt: Date.now(),
  };
  
  writeOAuthData(data);
  
  // Return without client secret
  const { clientSecret, ...configWithoutSecret } = data.configs[index];
  return configWithoutSecret as OAuthConfigServer;
}

/**
 * Delete an OAuth configuration
 */
export function deleteConfig(id: string): boolean {
  const data = readOAuthData();
  const initialLength = data.configs.length;
  
  data.configs = data.configs.filter(c => c.id !== id);
  
  if (data.configs.length === initialLength) {
    return false; // Config not found
  }
  
  writeOAuthData(data);
  return true;
}

/**
 * Get client secret for token exchange
 * This is the ONLY function that should return the client secret
 * Should only be called from secure backend routes
 */
export function getClientSecret(configId: string): string | null {
  const data = readOAuthData();
  const config = data.configs.find(c => c.id === configId);
  
  return config?.clientSecret || null;
}

/**
 * Check if a config exists
 */
export function configExists(id: string): boolean {
  const data = readOAuthData();
  return data.configs.some(c => c.id === id);
}

/**
 * Get configs by provider type
 */
export function getConfigsByProvider(provider: string): Omit<OAuthConfigServer, 'clientSecret'>[] {
  const data = readOAuthData();
  
  return data.configs
    .filter(c => c.provider === provider)
    .map(({ clientSecret, ...config }) => config);
}
