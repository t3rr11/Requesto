import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CliOAuthRepository, createTokenResolver } from '../src/auth';
import { CliAuthError } from '../src/cli-error';
import { OAuthService } from 'requesto-backend/services/oauth.service';

function makeRepo(opts?: Partial<ConstructorParameters<typeof CliOAuthRepository>[2][0]>) {
  const dataDir = mkdtempSync(path.join(tmpdir(), 'requesto-cli-oauth-'));
  return new CliOAuthRepository(
    () => dataDir,
    () => path.join(dataDir, 'local'),
    {
      injectedSecrets: new Map(),
      seededRefreshTokens: new Map(),
      persistTokens: false,
      ...opts,
    },
  );
}

describe('CliOAuthRepository', () => {
  it('seeds and resolves refresh tokens regardless of config id casing', () => {
    const repo = makeRepo();
    repo.seedRefreshToken('ci-auth', 'rt-123');

    expect(repo.getTokens('ci-auth')?.refreshToken).toBe('rt-123');
    expect(repo.getTokens('CI_AUTH')?.refreshToken).toBe('rt-123');
    expect(repo.getTokens('ci:auth')?.refreshToken).toBe('rt-123');
  });

  it('holds tokens in memory when not persisting, keyed case-insensitively', () => {
    const repo = makeRepo();
    repo.setTokens('ci-auth', { accessToken: 'at-1', tokenType: 'Bearer', obtainedAt: Date.now() });

    expect(repo.getTokens('CI-AUTH')?.accessToken).toBe('at-1');
  });

  it('injects client secrets without touching disk', () => {
    const repo = makeRepo({
      injectedSecrets: new Map([['MY_APP_AUTH', 'sec-1']]),
    });

    expect(repo.getClientSecret('my-app:auth')).toBe('sec-1');
    expect(repo.getClientSecret('MY-APP-AUTH')).toBe('sec-1');
    expect(repo.getClientSecret('other')).toBeNull();
  });
});

describe('createTokenResolver', () => {
  it('prefers explicit token overrides over the OAuth service', async () => {
    const repo = makeRepo();
    const oauthService = new OAuthService(repo);
    const resolver = createTokenResolver(oauthService, new Map([['CI_AUTH', 'override-token']]));

    // No config exists on disk — the override must win before the service is hit.
    const token = await resolver('ci-auth');
    expect(token).toEqual({ accessToken: 'override-token', tokenType: 'Bearer' });
  });

  it('wraps interactive-flow failures with actionable guidance', async () => {
    const dataDir = mkdtempSync(path.join(tmpdir(), 'requesto-cli-oauth-'));
    // Seed an oauth config on disk with an interactive flow
    const configDir = path.join(dataDir, 'oauth-configs');
    mkdirSync(configDir, { recursive: true });
    writeFileSync(
      path.join(configDir, 'ci-auth.json'),
      JSON.stringify({
        id: 'ci-auth',
        name: 'ci-auth',
        provider: 'generic',
        authorizationUrl: 'https://example.com/authorize',
        tokenUrl: 'https://example.com/token',
        clientId: 'ci',
        flowType: 'authorization-code-pkce',
        usePKCE: true,
        scopes: [],
      }),
    );

    const oauthService = new OAuthService(new CliOAuthRepository(() => dataDir, () => path.join(dataDir, 'local'), {
      injectedSecrets: new Map(),
      seededRefreshTokens: new Map(),
      persistTokens: false,
    }));
    const resolver = createTokenResolver(oauthService, new Map());

    const err = await resolver('ci-auth').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(CliAuthError);
    expect((err as CliAuthError).message).toContain('--token ci-auth=');
    expect((err as CliAuthError).message).toContain('authorization-code-pkce');
  });
});
