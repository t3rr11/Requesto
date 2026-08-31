import { OAuthRepository } from 'requesto-backend/repositories/oauth.repository';
import { OAuthService, InteractiveAuthRequiredError } from 'requesto-backend/services/oauth.service';
import type { OAuthTokenResolver } from 'requesto-backend/utils/auth';
import type { StoredOAuthToken } from 'requesto-backend/models/oauth';
import type { OAuthConfigServer, OAuthConfigPublic } from 'requesto-backend/models/oauth';
import { normalizeKey } from './vars.ts';
import { CliAuthError } from './cli-error.ts';

export type CliRepoOptions = {
  /** configId (normalised) → client secret injected from CI. */
  injectedSecrets: Map<string, string>;
  /** configId (normalised) → refresh token seeded for non-interactive refresh. */
  seededRefreshTokens: Map<string, string>;
  /** Whether tokens acquired during the run are written back to `local/`. */
  persistTokens: boolean;
};

/**
 * OAuth repository for headless runs. Layered on top of the workspace files:
 *
 *  - Client secrets can be injected from CI (`--oauth-secret` / env) without
 *    writing anything to disk.
 *  - Tokens acquired during the run are held in memory unless `persistTokens`
 *    is set (pipelines usually mount a read-only or ephemeral workspace).
 *  - Refresh tokens can be seeded (`--refresh-token`) so an interactive
 *    PKCE/auth-code config can still mint access tokens non-interactively.
 */
export class CliOAuthRepository extends OAuthRepository {
  private readonly memoryTokens = new Map<string, StoredOAuthToken>();

  constructor(
    getDataDir: () => string,
    getLocalDir: () => string,
    private readonly opts: CliRepoOptions,
  ) {
    super(getDataDir, getLocalDir);
  }

  /**
   * Seed an expired token entry carrying the given refresh token.
   * Accepts raw or normalised config ids — lookups are normalised.
   */
  seedRefreshToken(configId: string, refreshToken: string): void {
    this.memoryTokens.set(normalizeKey(configId), {
      accessToken: '',
      tokenType: 'Bearer',
      refreshToken,
      // Expired: forces getValidAccessToken() down the refresh path.
      obtainedAt: 0,
      expiresAt: 0,
    });
  }

  getClientSecret(configId: string): string | null {
    const injected = this.opts.injectedSecrets.get(normalizeKey(configId));
    if (injected !== undefined) return injected;
    return super.getClientSecret(configId);
  }

  findById(id: string, includeSecret = false): OAuthConfigServer | OAuthConfigPublic | null {
    const config = super.findById(id, false);
    if (!config || !includeSecret) return config;
    const secret = this.getClientSecret(id);
    return secret ? ({ ...config, clientSecret: secret } as OAuthConfigServer) : config;
  }

  getTokens(configId: string): StoredOAuthToken | null {
    return this.memoryTokens.get(normalizeKey(configId)) ?? super.getTokens(configId);
  }

  setTokens(configId: string, tokens: StoredOAuthToken): void {
    if (this.opts.persistTokens) {
      super.setTokens(configId, tokens);
    } else {
      this.memoryTokens.set(normalizeKey(configId), tokens);
    }
  }
}

/** Guidance appended to auth failures — kept actionable and short. */
function interactiveFlowGuidance(configId: string, flowType: string | undefined): string {
  return [
    `OAuth config "${configId}" uses the "${flowType ?? 'interactive'}" flow, which requires a browser and cannot run headless.`,
    `Options:`,
    `  1. Pass a ready access token:  --token ${configId}=<accessToken>  (or REQUESTO_TOKEN_* env var)`,
    `  2. Let your pipeline fetch the token (e.g. azure/login, AZURE CLI) and inject it as above.`,
    `  3. Seed a refresh token:       --refresh-token ${configId}=<refreshToken>`,
  ].join('\n');
}

/**
 * Build the OAuth token resolver used for every request in the run.
 *
 * Resolution order:
 *  1. Explicit token overrides (--token / REQUESTO_TOKEN_*) — applied as-is.
 *  2. Non-interactive OAuth flows (cached token → refresh → client-credentials /
 *     password re-fetch), exactly as the client resolves them.
 *  3. Interactive flows fail fast with actionable guidance.
 */
export function createTokenResolver(
  oauthService: OAuthService,
  tokenOverrides: Map<string, string>,
): OAuthTokenResolver {
  return async (configId) => {
    const override = tokenOverrides.get(normalizeKey(configId));
    if (override !== undefined) {
      return { accessToken: override, tokenType: 'Bearer' };
    }

    try {
      const token = await oauthService.getValidAccessToken(configId);
      return { accessToken: token.accessToken, tokenType: token.tokenType };
    } catch (err) {
      if (err instanceof InteractiveAuthRequiredError) {
        let flowType: string | undefined;
        try {
          flowType = oauthService.getById(configId).flowType;
        } catch {
          // config missing entirely — generic guidance still applies
        }
        throw new CliAuthError(configId, interactiveFlowGuidance(configId, flowType));
      }
      throw err;
    }
  };
}
