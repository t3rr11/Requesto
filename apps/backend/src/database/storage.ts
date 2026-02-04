import fs from 'fs';
import path from 'path';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
const TEMP_HISTORY_FILE = path.join(DATA_DIR, 'history.json.tmp');

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
function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Initialize history file if it doesn't exist
function ensureHistoryFile(): void {
  ensureDataDir();
  if (!fs.existsSync(HISTORY_FILE)) {
    writeHistoryFileAtomic([]);
  }
}

// Atomic write using temporary file
function writeHistoryFileAtomic(data: RequestRecord[]): void {
  try {
    // Write to temp file first
    fs.writeFileSync(TEMP_HISTORY_FILE, JSON.stringify(data, null, 2), 'utf-8');
    // Rename to actual file (atomic on most systems)
    fs.renameSync(TEMP_HISTORY_FILE, HISTORY_FILE);
  } catch (error) {
    console.error('Error writing history file:', error);
    // Clean up temp file if it exists
    if (fs.existsSync(TEMP_HISTORY_FILE)) {
      try {
        fs.unlinkSync(TEMP_HISTORY_FILE);
      } catch (cleanupError) {
        console.error('Error cleaning up temp file:', cleanupError);
      }
    }
    throw error;
  }
}

// Initialize on module load
ensureHistoryFile();

export function saveRequest(record: Omit<RequestRecord, 'id' | 'timestamp'>): RequestRecord {
  try {
    const history = getHistory(100); // Get full history for modification
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
    
    writeHistoryFileAtomic(history);
    return newRecord;
  } catch (error) {
    console.error('Error saving request:', error);
    throw error;
  }
}

export function getHistory(limit = 50): RequestRecord[] {
  try {
    ensureHistoryFile();
    const data = fs.readFileSync(HISTORY_FILE, 'utf-8');
    const history = JSON.parse(data) as RequestRecord[];
    return history.slice(0, limit);
  } catch (error) {
    console.error('Error reading history:', error);
    // Return empty array if file is corrupted
    return [];
  }
}

export function clearHistory(): void {
  try {
    writeHistoryFileAtomic([]);
  } catch (error) {
    console.error('Error clearing history:', error);
    throw error;
  }
}
