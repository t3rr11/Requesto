import fs from 'node:fs';
import path from 'node:path';
import { MOCK_HTTP_METHODS, MockEndpoint, MockHttpMethod, MockStaticResponse } from '../models/mock';
import { BaseRepository } from './base.repository';
import { readOrderSection, removeIdFromOrder, writeOrderSection } from '../utils/order';
import { resolveUniqueFileName } from '../utils/slug';

/**
 * Older endpoint files stored per-method `{ mode, static }` configs. Flatten
 * them into the current endpoint-level shape: any dynamic method converts the
 * whole endpoint to dynamic mode, otherwise the per-method static responses
 * are kept. Now-removed seed data is silently dropped.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeEndpoint(raw: any): MockEndpoint {
  const { mode, ...rest } = raw;
  delete rest.seedData;

  if (mode === 'dynamic') return { ...rest, mode, methods: {} };
  if (typeof mode === 'string') return { ...rest, mode };

  const legacyMethods = rest.methods ?? {};
  const hasDynamicMethod = Object.values(legacyMethods).some(
    (config) => config && (config as { mode?: string }).mode === 'dynamic',
  );
  if (hasDynamicMethod) return { ...rest, mode: 'dynamic', methods: {} };

  const methods: Partial<Record<MockHttpMethod, MockStaticResponse>> = {};
  for (const method of MOCK_HTTP_METHODS) {
    const config = legacyMethods[method];
    if (config?.static) methods[method] = config.static;
  }
  return { ...rest, mode: 'static', methods };
}

/**
 * Persistence for mock endpoint definitions (one JSON file per endpoint under
 * `<workspace>/.requesto/mock-endpoints/`, ordering in `order.json`) plus the
 * dynamic-mode datasets, which live in the gitignored local sidecar directory
 * (`<workspace>/.requesto/local/mock-data/<endpointId>.json`).
 */
export class MockEndpointRepository extends BaseRepository {
  constructor(
    private readonly getDataDir: () => string,
    private readonly getLocalDir: () => string,
  ) {
    super();
  }

  private getDir(): string {
    return path.join(this.getDataDir(), 'mock-endpoints');
  }

  private getDataFile(endpointId: string): string {
    return path.join(this.getLocalDir(), 'mock-data', `${endpointId}.json`);
  }

  private getServerStateFile(): string {
    return path.join(this.getLocalDir(), 'mock-server.json');
  }

  /** Read a single endpoint JSON file. Returns null for unreadable/invalid files. */
  private readEndpointFile(filePath: string): MockEndpoint | null {
    const parsed = this.readJson<unknown>(filePath, null);
    if (!parsed || typeof (parsed as { id?: unknown }).id !== 'string') return null;
    return normalizeEndpoint(parsed);
  }

  /** Find the file containing the endpoint with the given id. */
  private findFile(id: string): { fileName: string; endpoint: MockEndpoint } | null {
    const dir = this.getDir();
    if (!fs.existsSync(dir)) return null;
    for (const fileName of fs.readdirSync(dir)) {
      if (!fileName.endsWith('.json')) continue;
      const endpoint = this.readEndpointFile(path.join(dir, fileName));
      if (endpoint && endpoint.id === id) return { fileName, endpoint };
    }
    return null;
  }

  /**
   * Write an endpoint to its own file, renaming the file when the endpoint
   * name (and therefore its slug) changed.
   */
  private writeEndpoint(endpoint: MockEndpoint): void {
    const dir = this.getDir();
    this.ensureDir(dir);
    const existing = this.findFile(endpoint.id);
    const fileName = resolveUniqueFileName(dir, endpoint.name, endpoint.id);
    this.writeJson(path.join(dir, fileName), endpoint);
    if (existing && existing.fileName !== fileName) {
      fs.unlinkSync(path.join(dir, existing.fileName));
    }
  }

  private appendToOrder(id: string): void {
    const ids = readOrderSection(this.getDataDir(), 'mockEndpoints');
    if (!ids.includes(id)) {
      writeOrderSection(this.getDataDir(), 'mockEndpoints', [...ids, id]);
    }
  }

  getAll(): MockEndpoint[] {
    const dir = this.getDir();
    const byId = new Map<string, MockEndpoint>();
    if (fs.existsSync(dir)) {
      for (const fileName of fs.readdirSync(dir)) {
        if (!fileName.endsWith('.json')) continue;
        const endpoint = this.readEndpointFile(path.join(dir, fileName));
        if (endpoint && !byId.has(endpoint.id)) byId.set(endpoint.id, endpoint);
      }
    }

    const ordered: MockEndpoint[] = [];
    const seen = new Set<string>();
    for (const id of readOrderSection(this.getDataDir(), 'mockEndpoints')) {
      const endpoint = byId.get(id);
      if (endpoint) {
        ordered.push(endpoint);
        seen.add(id);
      }
    }
    // Endpoints missing from the manifest (e.g. added by another tool) keep readdir order
    for (const [id, endpoint] of byId) {
      if (!seen.has(id)) ordered.push(endpoint);
    }
    return ordered;
  }

  getById(id: string): MockEndpoint | undefined {
    return this.findFile(id)?.endpoint;
  }

  create(endpoint: MockEndpoint): MockEndpoint {
    this.writeEndpoint(endpoint);
    this.appendToOrder(endpoint.id);
    return endpoint;
  }

  update(id: string, updates: Partial<MockEndpoint>): MockEndpoint | null {
    const found = this.findFile(id);
    if (!found) return null;

    const merged = { ...found.endpoint, ...updates, id };
    this.writeEndpoint(merged);
    return merged;
  }

  delete(id: string): boolean {
    const found = this.findFile(id);
    if (!found) return false;
    fs.unlinkSync(path.join(this.getDir(), found.fileName));
    removeIdFromOrder(this.getDataDir(), id);
    this.deleteDataset(id);
    return true;
  }

  /** Persist a new endpoint ordering (drag-reorder) without rewriting endpoint files. */
  reorder(ids: string[]): void {
    writeOrderSection(this.getDataDir(), 'mockEndpoints', ids);
  }

  // ── Dynamic-mode dataset operations ──────────────────────────────────────

  readDataset(endpointId: string): unknown[] {
    return this.readJson<unknown[]>(this.getDataFile(endpointId), []);
  }

  writeDataset(endpointId: string, records: unknown[]): void {
    this.ensureDir(path.dirname(this.getDataFile(endpointId)));
    this.writeJson(this.getDataFile(endpointId), records);
  }

  /** Reset (delete) the dataset for an endpoint; next reads start empty. */
  deleteDataset(endpointId: string): void {
    try {
      fs.unlinkSync(this.getDataFile(endpointId));
    } catch {
      // Nothing to clean up when no dataset was persisted yet
    }
  }

  // ── Mock server state (gitignored local sidecar) ─────────────────────────

  readServerState(): { running: boolean; port: number } {
    const state = this.readJson<{ running: boolean; port: number } | null>(this.getServerStateFile(), null);
    if (!state || typeof state.running !== 'boolean' || typeof state.port !== 'number') {
      return { running: false, port: 0 };
    }
    return state;
  }

  writeServerState(state: { running: boolean; port: number }): void {
    this.ensureDir(path.dirname(this.getServerStateFile()));
    this.writeJson(this.getServerStateFile(), state);
  }
}
