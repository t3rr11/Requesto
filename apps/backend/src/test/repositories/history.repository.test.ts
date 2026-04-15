import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { HistoryRepository } from '../../repositories/history.repository';
import type { RequestRecord } from '../../models/history';

function makeRecord(overrides: Partial<RequestRecord> = {}): RequestRecord {
  return {
    id: `hist-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    method: 'GET',
    url: 'http://example.com',
    timestamp: Date.now(),
    status: 200,
    statusText: 'OK',
    duration: 150,
    ...overrides,
  };
}

describe('HistoryRepository', () => {
  let tmpDir: string;
  let repo: HistoryRepository;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'requesto-hist-test-'));
    repo = new HistoryRepository(() => tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns empty array when no history file', () => {
    expect(repo.getHistory()).toEqual([]);
  });

  it('saves and retrieves records', () => {
    const record = makeRecord();
    repo.save(record);

    const history = repo.getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe(record.id);
  });

  it('respects optional limit', () => {
    for (let i = 0; i < 5; i++) {
      repo.save(makeRecord({ url: `http://example.com/${i}` }));
    }
    const limited = repo.getHistory(3);
    expect(limited).toHaveLength(3);
  });

  it('clears all history', () => {
    repo.save(makeRecord());
    repo.save(makeRecord());

    repo.clear();
    expect(repo.getHistory()).toHaveLength(0);
  });

  it('caps history at MAX_RECORDS', () => {
    const max = 100;
    for (let i = 0; i < max + 10; i++) {
      repo.save(makeRecord({ url: `http://example.com/${i}` }));
    }
    const history = repo.getHistory();
    expect(history.length).toBeLessThanOrEqual(max);
  });
});
