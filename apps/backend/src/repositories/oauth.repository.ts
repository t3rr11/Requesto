import fs from 'node:fs';
import path from 'node:path';
import {
  OAuthConfigServer,
  OAuthConfigPublic,
  OAuthSecretsData,
  OAuthTokensData,
  StoredOAuthToken,
} from '../models/oauth';
import { BaseRepository } from './base.repository';
import { readOrderSection, removeIdFromOrder, writeOrderSection } from '../utils/order';
import { resolveUniqueFileName } from '../utils/slug';

export class OAuthRepository extends BaseRepository {
  constructor(
    private readonly getDataDir: () => string,
    private readonly getLocalDir: () => string,
  ) {
    super();
  }

  private getConfigDir(): string {
    return path.join(this.getDataDir(), 'oauth-configs');
  }

  private getSecretsFile(): string {
    return path.join(this.getLocalDir(), 'oauth-secrets.json');
  }

  private getTokensFile(): string {
    return path.join(this.getLocalDir(), 'oauth-tokens.json');
  }

  /** Read a single config JSON file. Returns null for unreadable/invalid files. */
  private readConfigFile(filePath: string): OAuthConfigPublic | null {
    const parsed = this.readJson<OAuthConfigPublic | null>(filePath, null);
    if (!parsed || typeof parsed.id !== 'string' || typeof parsed.name !== 'string') return null;
    return parsed;
  }

  /** Find the file containing the config with the given id. */
  private findConfigFile(id: string): { fileName: string; config: OAuthConfigPublic } | null {
    const dir = this.getConfigDir();
    if (!fs.existsSync(dir)) return null;
    for (const fileName of fs.readdirSync(dir)) {
      if (!fileName.endsWith('.json')) continue;
      const config = this.readConfigFile(path.join(dir, fileName));
      if (config && config.id === id) return { fileName, config };
    }
    return null;
  }

  /**
   * Write a config to its own file, renaming the file when the config name
   * (and therefore its slug) changed.
   */
  private writeConfig(config: OAuthConfigPublic): void {
    const dir = this.getConfigDir();
    this.ensureDir(dir);
    const existing = this.findConfigFile(config.id);
    const fileName = resolveUniqueFileName(dir, config.name, config.id);
    this.writeJson(path.join(dir, fileName), config);
    if (existing && existing.fileName !== fileName) {
      fs.unlinkSync(path.join(dir, existing.fileName));
    }
  }

  private appendToOrder(id: string): void {
    const ids = readOrderSection(this.getDataDir(), 'oauthConfigs');
    if (!ids.includes(id)) {
      writeOrderSection(this.getDataDir(), 'oauthConfigs', [...ids, id]);
    }
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
    const dir = this.getConfigDir();
    const byId = new Map<string, OAuthConfigPublic>();
    if (fs.existsSync(dir)) {
      for (const fileName of fs.readdirSync(dir)) {
        if (!fileName.endsWith('.json')) continue;
        const config = this.readConfigFile(path.join(dir, fileName));
        if (config && !byId.has(config.id)) byId.set(config.id, config);
      }
    }

    const ordered: OAuthConfigPublic[] = [];
    const seen = new Set<string>();
    for (const id of readOrderSection(this.getDataDir(), 'oauthConfigs')) {
      const config = byId.get(id);
      if (config) {
        ordered.push(config);
        seen.add(id);
      }
    }
    for (const [id, config] of byId) {
      if (!seen.has(id)) ordered.push(config);
    }
    return ordered;
  }

  findById(id: string, includeSecret = false): OAuthConfigServer | OAuthConfigPublic | null {
    const config = this.findConfigFile(id)?.config;
    if (!config) return null;
    if (!includeSecret) return config;

    const secrets = this.readSecrets();
    return { ...config, clientSecret: secrets.secrets[id] } as OAuthConfigServer;
  }

  create(
    configData: Omit<OAuthConfigServer, 'id'>,
  ): OAuthConfigPublic {
    const id = `oauth-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const { clientSecret, ...publicConfig } = configData;

    const newConfig: OAuthConfigPublic = {
      ...publicConfig,
      id
    };

    this.writeConfig(newConfig);
    this.appendToOrder(id);

    if (clientSecret) {
      const secrets = this.readSecrets();
      secrets.secrets[id] = clientSecret;
      this.writeSecrets(secrets);
    }

    return newConfig;
  }

  update(
    id: string,
    updates: Partial<Omit<OAuthConfigServer, 'id'>>,
  ): OAuthConfigPublic | null {
    const found = this.findConfigFile(id);
    if (!found) return null;

    const { clientSecret, ...publicUpdates } = updates;

    const updated: OAuthConfigPublic = {
      ...found.config,
      ...publicUpdates,
      id,
    };

    this.writeConfig(updated);

    if (clientSecret !== undefined) {
      const secrets = this.readSecrets();
      if (clientSecret) {
        secrets.secrets[id] = clientSecret;
      } else {
        delete secrets.secrets[id];
      }
      this.writeSecrets(secrets);
    }

    return updated;
  }

  delete(id: string): boolean {
    const found = this.findConfigFile(id);
    if (!found) return false;

    fs.unlinkSync(path.join(this.getConfigDir(), found.fileName));
    removeIdFromOrder(this.getDataDir(), id);

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
