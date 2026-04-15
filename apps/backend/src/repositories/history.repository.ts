import path from 'path';
import { RequestRecord } from '../models/history';
import { BaseRepository } from './base.repository';

export class HistoryRepository extends BaseRepository {
  private static readonly MAX_RECORDS = 100;

  constructor(private readonly getLocalDir: () => string) {
    super();
  }

  private getFilePath(): string {
    return path.join(this.getLocalDir(), 'history.json');
  }

  getHistory(limit = 50): RequestRecord[] {
    const history = this.readJson<RequestRecord[]>(this.getFilePath(), []);
    return history.slice(0, limit);
  }

  save(record: Omit<RequestRecord, 'id' | 'timestamp'>): RequestRecord {
    const historyFile = this.getFilePath();
    const history = this.getHistory(HistoryRepository.MAX_RECORDS);

    const newRecord: RequestRecord = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      ...record,
    };

    history.unshift(newRecord);
    if (history.length > HistoryRepository.MAX_RECORDS) {
      history.length = HistoryRepository.MAX_RECORDS;
    }

    this.writeJson(historyFile, history);
    return newRecord;
  }

  clear(): void {
    this.writeJson(this.getFilePath(), []);
  }
}
