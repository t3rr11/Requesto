import { MockEndpointRepository } from '../repositories/mock-endpoint.repository';
import { MockServerManager } from '../mock/mock-server-manager';
import { AppError } from '../errors/app-error';
import type { CreateMockEndpointDto, UpdateMockEndpointDto } from '../dtos/mock.dto';
import type {
  MockDatasetRecord,
  MockEndpoint,
  MockRequestLogEntry,
  MockServerStatus,
} from '../models/mock';

const LOG_BUFFER_SIZE = 100;

/**
 * Domain layer for mock endpoints and the standalone mock server.
 *
 * Holds the request log ring buffer; endpoint definitions and dynamic datasets
 * are delegated to the repository, server lifecycle to the manager.
 */
export class MockService {
  private readonly manager: MockServerManager;
  private logs: MockRequestLogEntry[] = [];
  private logCounter = 0;

  constructor(private readonly repo: MockEndpointRepository) {
    this.manager = new MockServerManager(repo, (hit) => this.recordHit(hit));
  }

  /** The mock server is always on: bring it up when the backend boots, on the last used port if known. */
  async autoStart(): Promise<void> {
    const { port } = this.repo.readServerState();
    try {
      await this.manager.start(port || undefined);
    } catch {
      // An occupied port must not prevent the app from booting
    }
  }

  start(port?: number): Promise<MockServerStatus> {
    return this.manager.start(port);
  }

  stop(): Promise<MockServerStatus> {
    return this.manager.stop();
  }

  getStatus(): MockServerStatus {
    return this.manager.getStatus();
  }

  getAll(): MockEndpoint[] {
    return this.repo.getAll();
  }

  getById(id: string): MockEndpoint {
    const endpoint = this.repo.getById(id);
    if (!endpoint) throw AppError.notFound('Mock endpoint not found');
    return endpoint;
  }

  create(data: CreateMockEndpointDto): MockEndpoint {
    const endpoint: MockEndpoint = {
      id: `mep-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      name: data.name,
      path: data.path,
      enabled: data.enabled,
      mode: data.mode,
      methods: data.methods,
    };
    return this.repo.create(endpoint);
  }

  update(id: string, data: UpdateMockEndpointDto): MockEndpoint {
    const existing = this.repo.getById(id);
    if (!existing) throw AppError.notFound('Mock endpoint not found');

    // Validate the merged result: e.g. switching an endpoint back to static
    // (or clearing its methods) must not leave it with nothing to serve.
    const merged = { ...existing, ...data, id };
    if (merged.mode === 'static' && Object.values(merged.methods).filter(Boolean).length === 0) {
      throw AppError.badRequest('At least one method must be configured in static mode');
    }

    const updated = this.repo.update(id, data as Partial<MockEndpoint>);
    if (!updated) throw AppError.notFound('Mock endpoint not found');
    return updated;
  }

  delete(id: string): void {
    const deleted = this.repo.delete(id);
    if (!deleted) throw AppError.notFound('Mock endpoint not found');
  }

  duplicate(id: string): MockEndpoint {
    const source = this.repo.getById(id);
    if (!source) throw AppError.notFound('Mock endpoint not found');

    const duplicate: MockEndpoint = {
      ...source,
      id: `mep-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      name: `${source.name} Copy`,
    };
    return this.repo.create(duplicate);
  }

  reorder(ids: string[]): void {
    const all = this.repo.getAll();
    const known = new Set(all.map((e) => e.id));
    const missing = ids.filter((id) => !known.has(id));
    if (missing.length > 0) {
      throw AppError.badRequest(`Unknown endpoint ids: ${missing.join(', ')}`);
    }
    this.repo.reorder(ids);
  }

  /** Current records backing dynamic mode for an endpoint (preview/reset in the UI). */
  getDataset(endpointId: string): unknown[] {
    return this.repo.readDataset(endpointId);
  }

  /** Replace the whole dynamic dataset (dataset editing in the UI). */
  updateDataset(endpointId: string, records: MockDatasetRecord[]): void {
    const endpoint = this.repo.getById(endpointId);
    if (!endpoint) throw AppError.notFound('Mock endpoint not found');
    this.repo.writeDataset(endpointId, records);
  }

  /** Remove the whole dynamic dataset; next reads start empty. */
  clearDataset(endpointId: string): void {
    const endpoint = this.repo.getById(endpointId);
    if (!endpoint) throw AppError.notFound('Mock endpoint not found');
    this.repo.deleteDataset(endpointId);
  }

  getLogs(): MockRequestLogEntry[] {
    return this.logs;
  }

  clearLogs(): void {
    this.logs = [];
  }

  private recordHit(hit: Omit<MockRequestLogEntry, 'id' | 'timestamp'>): void {
    this.logCounter += 1;
    this.logs.push({
      id: `mlog-${this.logCounter}`,
      timestamp: Date.now(),
      ...hit,
    });
    if (this.logs.length > LOG_BUFFER_SIZE) {
      this.logs = this.logs.slice(-LOG_BUFFER_SIZE);
    }
  }
}
