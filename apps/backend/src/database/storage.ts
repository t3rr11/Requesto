import fs from 'fs';
import path from 'path';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

interface RequestRecord {
  id: string;
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  status: number;
  statusText: string;
  duration: number;
  timestamp: number;
}

export function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function atomicWrite(filePath: string, data: unknown): void {
  const tempFile = `${filePath}.tmp`;
  try {
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, filePath);
  } catch (error) {
    if (fs.existsSync(tempFile)) {
      try {
        fs.unlinkSync(tempFile);
      } catch (cleanupError) {
        console.error('Error cleaning up temp file:', cleanupError);
      }
    }
    throw error;
  }
}

export function initializeFile(filePath: string, defaultData: unknown): void {
  ensureDataDir();
  if (!fs.existsSync(filePath)) {
    atomicWrite(filePath, defaultData);
  }
}

initializeFile(HISTORY_FILE, []);

export function saveRequest(record: Omit<RequestRecord, 'id' | 'timestamp'>): RequestRecord {
  try {
    const history = getHistory(100);
    const newRecord: RequestRecord = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      ...record,
    };
    
    history.unshift(newRecord);
    
    if (history.length > 100) {
      history.length = 100;
    }
    
    atomicWrite(HISTORY_FILE, history);
    return newRecord;
  } catch (error) {
    console.error('Error saving request:', error);
    throw error;
  }
}

export function getHistory(limit = 50): RequestRecord[] {
  try {
    const data = fs.readFileSync(HISTORY_FILE, 'utf-8');
    const history = JSON.parse(data) as RequestRecord[];
    return history.slice(0, limit);
  } catch (error) {
    console.error('Error reading history:', error);
    return [];
  }
}

export function clearHistory(): void {
  try {
    atomicWrite(HISTORY_FILE, []);
  } catch (error) {
    console.error('Error clearing history:', error);
    throw error;
  }
}
