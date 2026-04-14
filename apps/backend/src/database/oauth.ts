import fs from 'fs';
import path from 'path';
import { OAuthConfigServer } from '../types';
import { atomicWrite, getActiveDataDir, getActiveLocalDir } from './storage';

type OAuthConfigPublic = Omit<OAuthConfigServer, 'clientSecret'>;

interface OAuthData {
  configs: OAuthConfigPublic[];
}

interface OAuthSecretsData {
  secrets: Record<string, string>;
}

function getOAuthConfigFile(): string {
  return path.join(getActiveDataDir(), 'oauth-configs.json');
}

function getOAuthSecretsFile(): string {
  return path.join(getActiveLocalDir(), 'oauth-secrets.json');
}

function readOAuthData(): OAuthData {
  try {
    const configFile = getOAuthConfigFile();
    if (!fs.existsSync(configFile)) return { configs: [] };
    const data = fs.readFileSync(configFile, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading OAuth configs:', error);
    return { configs: [] };
  }
}

function writeOAuthData(data: OAuthData): void {
  try {
    atomicWrite(getOAuthConfigFile(), data);
  } catch (error) {
    console.error('Error writing OAuth configs:', error);
    throw error;
  }
}

function readSecrets(): OAuthSecretsData {
  try {
    const secretsFile = getOAuthSecretsFile();
    if (!fs.existsSync(secretsFile)) return { secrets: {} };
    const data = fs.readFileSync(secretsFile, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading OAuth secrets:', error);
    return { secrets: {} };
  }
}

function writeSecrets(data: OAuthSecretsData): void {
  try {
    atomicWrite(getOAuthSecretsFile(), data);
  } catch (error) {
    console.error('Error writing OAuth secrets:', error);
    throw error;
  }
}

export function getAllConfigs(): OAuthConfigPublic[] {
  const data = readOAuthData();
  return data.configs;
}

export function getConfig(
  id: string,
  includeSecret: boolean = false
): OAuthConfigServer | OAuthConfigPublic | null {
  const data = readOAuthData();
  const config = data.configs.find(c => c.id === id);
  
  if (!config) return null;
  if (!includeSecret) return config;
  
  const secrets = readSecrets();
  return { ...config, clientSecret: secrets.secrets[id] } as OAuthConfigServer;
}

export function createConfig(
  configData: Omit<OAuthConfigServer, 'id' | 'createdAt' | 'updatedAt'>
): OAuthConfigPublic {
  const data = readOAuthData();
  const id = `oauth-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const { clientSecret, ...publicConfig } = configData;

  const newConfig: OAuthConfigPublic = {
    ...publicConfig,
    id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  data.configs.push(newConfig);
  writeOAuthData(data);

  if (clientSecret) {
    const secrets = readSecrets();
    secrets.secrets[id] = clientSecret;
    writeSecrets(secrets);
  }
  
  return newConfig;
}

export function updateConfig(
  id: string,
  updates: Partial<Omit<OAuthConfigServer, 'id' | 'createdAt'>>
): OAuthConfigPublic | null {
  const data = readOAuthData();
  const index = data.configs.findIndex(c => c.id === id);
  
  if (index === -1) return null;

  const { clientSecret, ...publicUpdates } = updates;

  data.configs[index] = {
    ...data.configs[index],
    ...publicUpdates,
    id,
    updatedAt: Date.now(),
  };
  
  writeOAuthData(data);

  if (clientSecret !== undefined) {
    const secrets = readSecrets();
    if (clientSecret) {
      secrets.secrets[id] = clientSecret;
    } else {
      delete secrets.secrets[id];
    }
    writeSecrets(secrets);
  }
  
  return data.configs[index];
}

export function deleteConfig(id: string): boolean {
  const data = readOAuthData();
  const initialLength = data.configs.length;
  
  data.configs = data.configs.filter(c => c.id !== id);
  
  if (data.configs.length === initialLength) return false;
  
  writeOAuthData(data);

  const secrets = readSecrets();
  if (secrets.secrets[id]) {
    delete secrets.secrets[id];
    writeSecrets(secrets);
  }

  return true;
}

// GOTCHA: This is the ONLY function that returns clientSecret - only call from secure backend routes
export function getClientSecret(configId: string): string | null {
  const secrets = readSecrets();
  return secrets.secrets[configId] || null;
}

export function configExists(id: string): boolean {
  const data = readOAuthData();
  return data.configs.some(c => c.id === id);
}

export function getConfigsByProvider(provider: string): OAuthConfigPublic[] {
  const data = readOAuthData();
  return data.configs.filter(c => c.provider === provider);
}
