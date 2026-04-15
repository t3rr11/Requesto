import { describe, it, expect, vi } from 'vitest';
import { HistoryService } from '../../services/history.service';
import type { HistoryRepository } from '../../repositories/history.repository';
import type { RequestRecord } from '../../models/history';

function mockRepo(overrides: Partial<HistoryRepository> = {}): HistoryRepository {
  return {
    getHistory: vi.fn().mockReturnValue([]),
    save: vi.fn(),
    clear: vi.fn(),
    ...overrides,
  } as unknown as HistoryRepository;
}

describe('HistoryService', () => {
  describe('getHistory', () => {
    it('delegates to repo with optional limit', () => {
      const records: RequestRecord[] = [
        { id: 'h-1', method: 'GET', url: 'http://a.com', timestamp: 1000, status: 200, statusText: 'OK', duration: 10 },
      ];
      const repo = mockRepo({ getHistory: vi.fn().mockReturnValue(records) });
      const service = new HistoryService(repo);

      const result = service.getHistory(5);
      expect(repo.getHistory).toHaveBeenCalledWith(5);
      expect(result).toBe(records);
    });
  });

  describe('save', () => {
    it('adds id and timestamp before saving', () => {
      const repo = mockRepo();
      const service = new HistoryService(repo);

      service.save({ method: 'POST', url: 'http://b.com', status: 201, statusText: 'Created', duration: 50 });

      expect(repo.save).toHaveBeenCalledOnce();
      const saved = (repo.save as ReturnType<typeof vi.fn>).mock.calls[0][0] as RequestRecord;
      expect(saved.id).toMatch(/^hist-/);
      expect(saved.timestamp).toBeGreaterThan(0);
      expect(saved.method).toBe('POST');
      expect(saved.url).toBe('http://b.com');
    });
  });

  describe('clear', () => {
    it('delegates to repo.clear', () => {
      const repo = mockRepo();
      const service = new HistoryService(repo);
      service.clear();
      expect(repo.clear).toHaveBeenCalledOnce();
    });
  });
});
