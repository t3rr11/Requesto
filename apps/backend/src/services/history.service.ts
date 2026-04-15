import { HistoryRepository } from '../repositories/history.repository';
import type { RequestRecord } from '../models/history';

export class HistoryService {
  constructor(private readonly repo: HistoryRepository) {}

  getHistory(limit?: number): RequestRecord[] {
    return this.repo.getHistory(limit);
  }

  save(record: Omit<RequestRecord, 'id' | 'timestamp'>): void {
    const full: RequestRecord = {
      ...record,
      id: `hist-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      timestamp: Date.now(),
    };
    this.repo.save(full);
  }

  clear(): void {
    this.repo.clear();
  }
}
