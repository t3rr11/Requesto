import fs from 'fs';
import path from 'path';
import { atomicWrite, initializeFile, ensureDir } from '../helpers/fileUtils';
import { getWorkspaceDataDir, getWorkspaceLocalDir } from './workspaces';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');

interface RequestRecord {
  id: string;
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  bodyType?: string;
  status: number;
  statusText: string;
  duration: number;
  timestamp: number;
}

/** Root data directory for the workspace registry */
export function getRootDataDir(): string {
  return DATA_DIR;
}

/** Active workspace's data directory (collections, environments, oauth configs) */
export function getActiveDataDir(): string {
  return getWorkspaceDataDir();
}

/** Active workspace's local-only directory (.requesto/ — history, secrets) */
export function getActiveLocalDir(): string {
  return getWorkspaceLocalDir();
}

function getHistoryFile(): string {
  return path.join(getActiveLocalDir(), 'history.json');
}

export function ensureDataDir(): void {
  ensureDir(DATA_DIR);
}

// Re-export atomicWrite and initializeFile for backward compatibility
export { atomicWrite, initializeFile };

export function saveRequest(record: Omit<RequestRecord, 'id' | 'timestamp'>): RequestRecord {
  try {
    const historyFile = getHistoryFile();
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
    
    atomicWrite(historyFile, history);
    return newRecord;
  } catch (error) {
    console.error('Error saving request:', error);
    throw error;
  }
}

export function getHistory(limit = 50): RequestRecord[] {
  try {
    const historyFile = getHistoryFile();
    if (!fs.existsSync(historyFile)) return [];
    const data = fs.readFileSync(historyFile, 'utf-8');
    const history = JSON.parse(data) as RequestRecord[];
    return history.slice(0, limit);
  } catch (error) {
    console.error('Error reading history:', error);
    return [];
  }
}

export function clearHistory(): void {
  try {
    atomicWrite(getHistoryFile(), []);
  } catch (error) {
    console.error('Error clearing history:', error);
    throw error;
  }
}
