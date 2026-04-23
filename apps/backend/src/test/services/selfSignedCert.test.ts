import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import https from 'node:https';
import { AddressInfo } from 'node:net';
import selfsigned from 'selfsigned';
import { OAuthService } from '../../services/oauth.service';
import { ProxyService } from '../../services/proxy.service';
import type { OAuthRepository } from '../../repositories/oauth.repository';
import type { OAuthConfigServer } from '../../models/oauth';
import type { EnvironmentService } from '../../services/environment.service';
import type { HistoryService } from '../../services/history.service';

/**
 * End-to-end test that proves the global "ignore SSL certificate errors"
 * setting (sent through as `insecureTls`) makes both OAuth token exchange
 * and the general request proxy work against an HTTPS endpoint that
 * presents a self-signed certificate.
 *
 * This is the regression test for the headline user-testing bug:
 *   "When requesting for an OAuth token from a provider there is no way
 *    to ignore self-signed certificates in chain."
 */

interface TestServerHandle {
  url: string;
  close: () => Promise<void>;
}

async function startSelfSignedServer(handler: (req: import('http').IncomingMessage, res: import('http').ServerResponse) => void): Promise<TestServerHandle> {
  const pems = await selfsigned.generate(
    [{ name: 'commonName', value: 'localhost' }],
    {
      days: 1,
      keySize: 2048,
      algorithm: 'sha256',
    },
  );
  const server = https.createServer({ key: pems.private, cert: pems.cert }, handler);

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as AddressInfo).port;
      resolve({
        url: `https://127.0.0.1:${port}`,
        close: () =>
          new Promise<void>((r) => {
            server.close(() => r());
          }),
      });
    });
  });
}

function makeOAuthRepo(config: OAuthConfigServer, clientSecret: string | null = 'test-secret'): OAuthRepository {
  return {
    findById: vi.fn().mockReturnValue(config),
    getClientSecret: vi.fn().mockReturnValue(clientSecret),
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  } as unknown as OAuthRepository;
}

function makeProxyServiceDeps(): { environmentService: EnvironmentService; historyService: HistoryService } {
  const environmentService = {
    substituteInRequest: (req: { url: string; headers?: Record<string, string>; body?: string; formDataEntries?: unknown }) => req,
    substituteInAuth: (auth: unknown) => auth,
  } as unknown as EnvironmentService;
  const historyService = { save: vi.fn() } as unknown as HistoryService;
  return { environmentService, historyService };
}

describe('Self-signed certificate handling (insecureTls)', () => {
  let server: TestServerHandle;

  beforeAll(async () => {
    server = await startSelfSignedServer((req, res) => {
      if (req.url === '/oauth/token') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ access_token: 'abc123', token_type: 'Bearer', expires_in: 3600 }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
  });

  afterAll(async () => {
    await server.close();
  });

  describe('OAuthService.exchangeToken', () => {
    function buildConfig(): OAuthConfigServer {
      return {
        id: 'oauth-1',
        name: 'Self-signed provider',
        provider: 'custom',
        authorizationUrl: `${server.url}/authorize`,
        tokenUrl: `${server.url}/oauth/token`,
        clientId: 'client-id',
        flowType: 'authorization_code',
        usePKCE: false,
        scopes: [],
        createdAt: 0,
        updatedAt: 0,
      } as OAuthConfigServer;
    }

    it('REGRESSION: rejects with a TLS error when insecureTls is false', async () => {
      const repo = makeOAuthRepo(buildConfig());
      const service = new OAuthService(repo);

      await expect(
        service.exchangeToken({
          configId: 'oauth-1',
          code: 'auth-code',
          redirectUri: 'http://localhost/callback',
          insecureTls: false,
        }),
      ).rejects.toMatchObject({
        code: expect.stringMatching(/SELF_SIGNED_CERT|DEPTH_ZERO_SELF_SIGNED_CERT|UNABLE_TO_VERIFY_LEAF_SIGNATURE/),
      });
    });

    it('FIX: succeeds against a self-signed server when insecureTls is true', async () => {
      const repo = makeOAuthRepo(buildConfig());
      const service = new OAuthService(repo);

      const result = await service.exchangeToken({
        configId: 'oauth-1',
        code: 'auth-code',
        redirectUri: 'http://localhost/callback',
        insecureTls: true,
      });

      expect(result).toMatchObject({ access_token: 'abc123', token_type: 'Bearer' });
    });
  });

  describe('ProxyService.executeRequest', () => {
    it('REGRESSION: rejects when insecureTls is false', async () => {
      const { environmentService, historyService } = makeProxyServiceDeps();
      const service = new ProxyService(environmentService, historyService);

      await expect(
        service.executeRequest({
          method: 'GET',
          url: `${server.url}/anything`,
          insecureTls: false,
        }),
      ).rejects.toMatchObject({
        code: expect.stringMatching(/SELF_SIGNED_CERT|DEPTH_ZERO_SELF_SIGNED_CERT|UNABLE_TO_VERIFY_LEAF_SIGNATURE/),
      });
    });

    it('FIX: succeeds when insecureTls is true', async () => {
      const { environmentService, historyService } = makeProxyServiceDeps();
      const service = new ProxyService(environmentService, historyService);

      const result = await service.executeRequest({
        method: 'GET',
        url: `${server.url}/anything`,
        insecureTls: true,
      });

      expect(result.status).toBe(200);
      expect(JSON.parse(result.body)).toEqual({ ok: true });
    });
  });
});
