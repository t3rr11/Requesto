export interface RequestRecord {
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
