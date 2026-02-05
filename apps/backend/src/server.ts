import Fastify from 'fastify';
import cors from '@fastify/cors';
import path from 'path';
import { proxyRoutes } from './routes/proxy';
import environmentRoutes from './routes/environments';
import collectionsRoutes from './routes/collections';
import { sseTestRoutes } from './routes/sse-test';
import { oauthRoutes } from './routes/oauth';

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
  requestIdHeader: 'x-request-id',
  disableRequestLogging: false,
});

async function start() {
  try {
    await server.register(cors, {
      origin: (origin, callback) => {
        const allowedOrigins = [
          'http://localhost:5173',
          'http://localhost:4000',
          /^file:\/\//,
        ];
        
        if (!origin || allowedOrigins.some(allowed => 
          typeof allowed === 'string' ? allowed === origin : allowed.test(origin)
        )) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'), false);
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    });

    await server.register(proxyRoutes, { prefix: '/api' });
    await server.register(environmentRoutes, { prefix: '/api' });
    await server.register(collectionsRoutes, { prefix: '/api' });
    await server.register(sseTestRoutes, { prefix: '/api' });
    await server.register(oauthRoutes, { prefix: '/api' });

    server.get('/health', async () => {
      return { status: 'ok' };
    });

    if (process.env.NODE_ENV === 'production') {
      const fastifyStatic = await import('@fastify/static');
      await server.register(fastifyStatic.default, {
        root: path.join(__dirname, '..', 'public'),
        prefix: '/',
      });

      server.setNotFoundHandler((request, reply) => {
        if (request.url.startsWith('/api')) {
          reply.code(404).send({ error: 'Not found' });
        } else {
          reply.sendFile('index.html');
        }
      });
    }

    const port = process.env.PORT ? parseInt(process.env.PORT) : 4000;
    const host = process.env.HOST || '0.0.0.0';

    await server.listen({ port, host });
    console.log(`Server listening on http://${host}:${port}`);
    
    const signals = ['SIGINT', 'SIGTERM'] as const;
    signals.forEach(signal => {
      process.on(signal, async () => {
        console.log(`${signal} received, closing server...`);
        await server.close();
        console.log('Server closed');
        process.exit(0);
      });
    });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();
