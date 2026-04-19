export type UpdateStatus = 'idle' | 'available' | 'downloading' | 'downloaded' | 'error';

export interface UpdateProgress {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

export interface UpdateInfo {
  version: string;
  releaseNotes: string | null;
}
