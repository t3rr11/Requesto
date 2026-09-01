import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { buildApp } from 'requesto-backend/app';
import type { FastifyInstance } from 'fastify';

export type EmbeddedServerOptions = {
  /** The `.requesto` directory to seed the scratch server from. */
  requestoDir: string;
};

/**
 * An ephemeral Requesto server owned by the run itself.
 *
 * The workspace is copied to a temp directory and a real backend instance is
 * booted against the copy on 127.0.0.1 with a random port. Collections,
 * environments and workspaces created or deleted by the run only ever touch
 * the temp copy; the source workspace and any server the user has running
 * are untouched. `stop()` closes the server and deletes the temp copy.
 */
export class EmbeddedRequestoServer {
  private readonly requestoDir: string;
  private readonly tempRoot: string;
  private server: FastifyInstance | null = null;
  private baseUrl: string | null = null;

  constructor(opts: EmbeddedServerOptions) {
    this.requestoDir = path.resolve(opts.requestoDir);
    this.tempRoot = path.join(
      os.tmpdir(),
      `requesto-run-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
    );
  }

  /** Seed the temp workspace, boot the backend and start listening. */
  async start(): Promise<void> {
    if (!fs.existsSync(this.requestoDir)) {
      throw new Error(`Cannot seed the scratch server: workspace not found at ${this.requestoDir}`);
    }

    // Layout: <tempRoot>/workspace/.requesto (the copied workspace) and
    // <tempRoot>/data (the backend's data dir with a registry pointing at it).
    const workspaceRoot = path.join(this.tempRoot, 'workspace');
    fs.cpSync(this.requestoDir, path.join(workspaceRoot, '.requesto'), { recursive: true });

    const dataDir = path.join(this.tempRoot, 'data');
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(
      path.join(dataDir, 'workspaces.json'),
      JSON.stringify({
        activeWorkspaceId: 'ws-embedded-run',
        workspaces: [{ id: 'ws-embedded-run', name: 'requesto-run', path: workspaceRoot }],
      }),
      'utf8',
    );

    const server = await buildApp({ dataDir, logLevel: 'warn' });
    await server.listen({ port: 0, host: '127.0.0.1' });

    const address = server.server.address();
    if (address === null || typeof address === 'string') {
      await server.close();
      throw new Error('Embedded scratch server did not report a listening port');
    }

    this.server = server;
    this.baseUrl = `http://127.0.0.1:${address.port}`;
  }

  /** Base URL requests should use to hit the scratch server. */
  get url(): string {
    if (!this.baseUrl) {
      throw new Error('Embedded scratch server is not running (call start() first)');
    }
    return this.baseUrl;
  }

  /** Close the server and delete the temp workspace copy. */
  async stop(): Promise<void> {
    if (this.server) {
      try {
        await this.server.close();
      } finally {
        this.server = null;
        this.baseUrl = null;
      }
    }
    fs.rmSync(this.tempRoot, { recursive: true, force: true });
  }
}
