import path from 'node:path';
import { buildApp } from './app';
import { DATA_DIR, PORT, HOST, LOG_LEVEL, CORS_ORIGINS } from './config/index';

async function start() {
  try {
    // In production the built frontend is served by the same process.
    const staticRoot = process.env.NODE_ENV === 'production'
      ? path.join(__dirname, '..', 'public')
      : undefined;

    const server = await buildApp({
      dataDir: DATA_DIR,
      logLevel: LOG_LEVEL,
      corsOrigins: CORS_ORIGINS,
      staticRoot,
    });

    await server.listen({ port: PORT, host: HOST });
    console.log(`Server listening on http://${HOST}:${PORT}`);

    const signals = ['SIGINT', 'SIGTERM'] as const;
    signals.forEach((signal) => {
      process.on(signal, async () => {
        console.log(`${signal} received, closing server...`);
        await server.close();
        console.log('Server closed');
        process.exit(0);
      });
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

start();
