import { OAuthService, InteractiveAuthRequiredError } from 'requesto-backend/services/oauth.service';
import type { OAuthTokenResolver } from 'requesto-engine';
import { normalizeKey } from '../vars.ts';
import { CliAuthError } from '../cli-error.ts';

/** Guidance appended to auth failures: kept actionable and short. */
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
 *  1. Explicit token overrides (--token / REQUESTO_TOKEN_*): applied as-is.
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
          // config missing entirely: generic guidance still applies
        }
        throw new CliAuthError(configId, interactiveFlowGuidance(configId, flowType));
      }
      throw err;
    }
  };
}
