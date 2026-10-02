import { FastifyInstance } from 'fastify';
import { MockEndpointRepository } from '../repositories/mock-endpoint.repository';
import { AppError } from '../errors/app-error';
import { MOCK_PORT } from '../config';
import { MockServerStatus } from '../models/mock';
import { buildMockApp, MockAppOptions, MockHitInfo } from './mock-app';

/**
 * Owns the lifecycle of the standalone mock Fastify instance. Only one mock
 * server runs at a time (serving the active workspace's endpoints); starting
 * again with a different port performs a stop/restart.
 */
export class MockServerManager {
  private server: FastifyInstance | null = null;
  private port = 0;

  constructor(
    private readonly endpointRepository: MockEndpointRepository,
    private readonly onHit: (hit: MockHitInfo) => void,
  ) {}

  async start(portOverride?: number): Promise<MockServerStatus> {
    const port = portOverride ?? MOCK_PORT;
    if (this.server && this.port === port) {
      return this.getStatus();
    }

    if (this.server) {
      await this.stopInternal();
    }

    const appOptions: MockAppOptions = {
      endpointRepository: this.endpointRepository,
      onHit: this.onHit,
    };
    const server = await buildMockApp(appOptions);

    try {
      await server.listen({ port, host: '0.0.0.0' });
    } catch (error) {
      await server.close().catch(() => {});
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('EADDRINUSE')) {
        throw AppError.conflict(`Port ${port} is already in use. Choose a different port.`);
      }
      throw AppError.internal(`Failed to start mock server: ${message}`);
    }

    this.server = server;
    this.port = port;
    this.endpointRepository.writeServerState({ running: true, port });
    return this.getStatus();
  }

  async stop(): Promise<MockServerStatus> {
    await this.stopInternal();
    this.endpointRepository.writeServerState({ running: false, port: 0 });
    return this.getStatus();
  }

  getStatus(): MockServerStatus {
    if (!this.server) {
      return { running: false, port: 0, url: null };
    }
    return {
      running: true,
      port: this.port,
      url: `http://localhost:${this.port}`,
    };
  }

  /** Close the running server without touching the persisted state flag. */
  private async stopInternal(): Promise<void> {
    if (!this.server) return;
    const server = this.server;
    this.server = null;
    this.port = 0;
    await server.close();
  }
}
