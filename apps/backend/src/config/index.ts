import path from 'path';

export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
export const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
export const HOST = process.env.HOST || '0.0.0.0';
export const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
export const NODE_ENV = process.env.NODE_ENV || 'development';

export const CORS_ORIGINS: Array<string | RegExp> = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4000',
  /^file:\/\//,
];
