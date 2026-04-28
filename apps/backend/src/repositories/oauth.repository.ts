import path from 'path';
import {
  OAuthConfigServer,
  OAuthConfigPublic,
  OAuthData,
  OAuthSecretsData,
  OAuthTokensData,
  StoredOAuthToken,
} from '../models/oauth';
import { BaseRepository } from './base.repository';

export class OAuthRepository extends BaseRepository {
  constructor(
    private readonly getDataDir: () => string,
    private readonly getLocalDir: () => string,
  ) {
    super();
  }

  private getConfigFile(): string {
    return path.join(this.getDataDir(), 'oauth-configs.json');
  }

  private getSecretsFile(): string {
    return path.join(this.getLocalDir(), 'oauth-secrets.json');
  }

  private getTokensFile(): string {
    return path.join(this.getLocalDir(), 'oauth-tokens.json');
  }

  private readData(): OAuthData {
    return this.readJson<OAuthData>(this.getConfigFile(), { configs: [] });
  }

  private writeData(data: OAuthData): void {
    this.writeJson(this.getConfigFile(), data);
  }

  private readSecrets(): OAuthSecretsData {
    return this.readJson<OAuthSecretsData>(this.getSecretsFile(), { secrets: {} });
  }

  private writeSecrets(data: OAuthSecretsData): void {
    this.writeJson(this.getSecretsFile(), data);
  }

  private readTokens(): OAuthTokensData {
    return this.readJson<OAuthTokensData>(this.getTokensFile(), { tokens: {} });
  }

  private writeTokens(data: OAuthTokensData): void {
    this.writeJson(this.getTokensFile(), data);
  }

  getAll(): OAuthConfigPublic[] {
    return this.readData().configs;
  }

  findById(id: string, includeSecret = false): OAuthConfigServer | OAuthConfigPublic | null {
    const data = this.readData();
    const config = data.configs.find((c) => c.id === id);
    if (!config) return null;
    if (!includeSecret) return config;

    const secrets = this.readSecrets();
    return { ...config, clientSecret: secrets.secrets[id] } as OAuthConfigServer;
  }

  create(
    configData: Omit<OAuthConfigServer, 'id' | 'createdAt' | 'updatedAt'>,
  ): OAuthConfigPublic {
    const data = this.readData();
    const id = `oauth-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const { clientSecret, ...publicConfig } = configData;

    const newConfig: OAuthConfigPublic = {
      ...publicConfig,
      id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    data.configs.push(newConfig);
    this.writeData(data);

    if (clientSecret) {
      const secrets = this.readSecrets();
      secrets.secrets[id] = clientSecret;
      this.writeSecrets(secrets);
    }

    return newConfig;
  }

  update(
    id: string,
    updates: Partial<Omit<OAuthConfigServer, 'id' | 'createdAt'>>,
  ): OAuthConfigPublic | null {
    const data = this.readData();
    const index = data.configs.findIndex((c) => c.id === id);
    if (index === -1) return null;

    const { clientSecret, ...publicUpdates } = updates;

    data.configs[index] = {
      ...data.configs[index],
      ...publicUpdates,
      id,
      updatedAt: Date.now(),
    };

    this.writeData(data);

    if (clientSecret !== undefined) {
      const secrets = this.readSecrets();
      if (clientSecret) {
        secrets.secrets[id] = clientSecret;
      } else {
        delete secrets.secrets[id];
      }
      this.writeSecrets(secrets);
    }

    return data.configs[index];
  }

  delete(id: string): boolean {
    const data = this.readData();
    const initial = data.configs.length;
    data.configs = data.configs.filter((c) => c.id !== id);
    if (data.configs.length === initial) return false;

    this.writeData(data);

    const secrets = this.readSecrets();
    if (secrets.secrets[id]) {
      delete secrets.secrets[id];
      this.writeSecrets(secrets);
    }

    this.deleteTokens(id);

    return true;
  }

  /** Returns the client secret for a config. Only callable from backend routes. */
  getClientSecret(configId: string): string | null {
    const secrets = this.readSecrets();
    return secrets.secrets[configId] ?? null;
  }

  // ── Token persistence ────────────────────────────────────────────────────

  getTokens(configId: string): StoredOAuthToken | null {
    const data = this.readTokens();
    return data.tokens[configId] ?? null;
  }

  setTokens(configId: string, tokens: StoredOAuthToken): void {
    const data = this.readTokens();
    data.tokens[configId] = tokens;
    this.writeTokens(data);
  }

  deleteTokens(configId: string): boolean {
    const data = this.readTokens();
    if (!data.tokens[configId]) return false;
    delete data.tokens[configId];
    this.writeTokens(data);
    return true;
  }
}
