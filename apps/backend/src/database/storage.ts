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

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize history file if it doesn't exist
if (!fs.existsSync(HISTORY_FILE)) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify([]), 'utf-8');
}

export function saveRequest(record: Omit<RequestRecord, 'id' | 'timestamp'>): RequestRecord {
  const history = getHistory();
  const newRecord: RequestRecord = {
    id: Date.now().toString(),
    timestamp: Date.now(),
    ...record,
  };
  
  history.unshift(newRecord); // Add to beginning
  
  // Keep only last 100 requests
  if (history.length > 100) {
    history.length = 100;
  }
  
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
  return newRecord;
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
  fs.writeFileSync(HISTORY_FILE, JSON.stringify([]), 'utf-8');
}
