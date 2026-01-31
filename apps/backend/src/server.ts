import Fastify from 'fastify';
import cors from '@fastify/cors';
import path from 'path';
import { proxyRoutes } from './routes/proxy';
import environmentRoutes from './routes/environments';
import collectionsRoutes from './routes/collections';

const server = Fastify({
  logger: true,
});

async function start() {
  try {
    // Register CORS
    await server.register(cors, {
      origin: true,
    });

    // Register routes
    await server.register(proxyRoutes, { prefix: '/api' });
    await server.register(environmentRoutes, { prefix: '/api' });
    await server.register(collectionsRoutes, { prefix: '/api' });

    // Health check
    server.get('/health', async () => {
      return { status: 'ok' };
    });

    // Serve static files in production
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

    const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;
    const host = process.env.HOST || '0.0.0.0';

    await server.listen({ port, host });
    console.log(`Server listening on http://${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();
