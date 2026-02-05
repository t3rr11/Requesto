import fs from 'fs';
import path from 'path';
import { OAuthConfigServer } from '../types';
import { initializeFile, atomicWrite } from './storage';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const OAUTH_FILE = path.join(DATA_DIR, 'oauth-configs.json');

interface OAuthData {
  configs: OAuthConfigServer[];
}

initializeFile(OAUTH_FILE, { configs: [] } as OAuthData);

function readOAuthData(): OAuthData {
  try {
    const data = fs.readFileSync(OAUTH_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading OAuth configs:', error);
    return { configs: [] };
  }
}

function writeOAuthData(data: OAuthData): void {
  try {
    atomicWrite(OAUTH_FILE, data);
  } catch (error) {
    console.error('Error writing OAuth configs:', error);
    throw error;
  }
}

export function getAllConfigs(): Omit<OAuthConfigServer, 'clientSecret'>[] {
  const data = readOAuthData();
  return data.configs.map(({ clientSecret, ...config }) => config);
}

export function getConfig(
  id: string,
  includeSecret: boolean = false
): OAuthConfigServer | Omit<OAuthConfigServer, 'clientSecret'> | null {
  const data = readOAuthData();
  const config = data.configs.find(c => c.id === id);
  
  if (!config) return null;
  if (includeSecret) return config;
  
  const { clientSecret, ...configWithoutSecret } = config;
  return configWithoutSecret;
}

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
  
  const { clientSecret, ...configWithoutSecret } = newConfig;
  return configWithoutSecret as OAuthConfigServer;
}

export function updateConfig(
  id: string,
  updates: Partial<Omit<OAuthConfigServer, 'id' | 'createdAt'>>
): OAuthConfigServer | null {
  const data = readOAuthData();
  const index = data.configs.findIndex(c => c.id === id);
  
  if (index === -1) return null;
  
  data.configs[index] = {
    ...data.configs[index],
    ...updates,
    id,
    updatedAt: Date.now(),
  };
  
  writeOAuthData(data);
  
  const { clientSecret, ...configWithoutSecret } = data.configs[index];
  return configWithoutSecret as OAuthConfigServer;
}

export function deleteConfig(id: string): boolean {
  const data = readOAuthData();
  const initialLength = data.configs.length;
  
  data.configs = data.configs.filter(c => c.id !== id);
  
  if (data.configs.length === initialLength) return false;
  
  writeOAuthData(data);
  return true;
}

// GOTCHA: This is the ONLY function that returns clientSecret - only call from secure backend routes
export function getClientSecret(configId: string): string | null {
  const data = readOAuthData();
  const config = data.configs.find(c => c.id === configId);
  return config?.clientSecret || null;
}

export function configExists(id: string): boolean {
  const data = readOAuthData();
  return data.configs.some(c => c.id === id);
}

export function getConfigsByProvider(provider: string): Omit<OAuthConfigServer, 'clientSecret'>[] {
  const data = readOAuthData();
  return data.configs
    .filter(c => c.provider === provider)
    .map(({ clientSecret, ...config }) => config);
}
