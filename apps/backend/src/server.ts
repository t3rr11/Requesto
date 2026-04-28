import Fastify from 'fastify';
import cors from '@fastify/cors';
import path from 'path';
import { sseTestRoutes } from './controllers/sse-test.controller';
import { registerErrorHandler } from './errors/error-handler';
import { DATA_DIR, PORT, HOST, LOG_LEVEL, CORS_ORIGINS } from './config/index';

// Repositories
import { CollectionRepository } from './repositories/collection.repository';
import { EnvironmentRepository } from './repositories/environment.repository';
import { OAuthRepository } from './repositories/oauth.repository';
import { WorkspaceRepository } from './repositories/workspace.repository';
import { HistoryRepository } from './repositories/history.repository';

// Services
import { CollectionService } from './services/collection.service';
import { EnvironmentService } from './services/environment.service';
import { HistoryService } from './services/history.service';
import { OAuthService } from './services/oauth.service';
import { ProxyService } from './services/proxy.service';
import { WorkspaceService } from './services/workspace.service';
import { GitService } from './services/git.service';
import { OpenApiService } from './services/openapi.service';

// Controllers
import collectionController from './controllers/collection.controller';
import environmentController from './controllers/environment.controller';
import proxyController from './controllers/proxy.controller';
import oauthController from './controllers/oauth.controller';
import workspaceController from './controllers/workspace.controller';
import gitController from './controllers/git.controller';


const WORKSPACES_DIR = path.join(DATA_DIR, 'workspaces');
const WORKSPACES_FILE = path.join(DATA_DIR, 'workspaces.json');

// Instantiate repository layer
const workspaceRepo = new WorkspaceRepository(DATA_DIR, WORKSPACES_DIR, WORKSPACES_FILE);
const workspaceService = new WorkspaceService(workspaceRepo);

// Repositories that need the active workspace's data dir
const getDataDir = () => workspaceRepo.getDataDir();
const getLocalDir = () => workspaceRepo.getLocalDir();

const collectionRepo = new CollectionRepository(getDataDir);
const environmentRepo = new EnvironmentRepository(getDataDir);
const oauthRepo = new OAuthRepository(getDataDir, getLocalDir);
const historyRepo = new HistoryRepository(getLocalDir);

// Instantiate service layer
const collectionService = new CollectionService(collectionRepo);
const environmentService = new EnvironmentService(environmentRepo);
const historyService = new HistoryService(historyRepo);
const oauthService = new OAuthService(oauthRepo);
const proxyService = new ProxyService(environmentService, historyService, oauthService);
const gitService = new GitService(workspaceService);
const openApiService = new OpenApiService(collectionService);

const server = Fastify({
  logger: {
    level: LOG_LEVEL,
  },
  requestIdHeader: 'x-request-id',
  disableRequestLogging: false,
});

async function start() {
  try {
    await server.register(cors, {
      origin: (origin, callback) => {
        if (!origin || CORS_ORIGINS.some((allowed) =>
          typeof allowed === 'string' ? allowed === origin : allowed.test(origin),
        )) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'), false);
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    });

    registerErrorHandler(server);

    await server.register(collectionController, { prefix: '/api', collectionService, openApiService });
    await server.register(environmentController, { prefix: '/api', environmentService });
    await server.register(proxyController, { prefix: '/api', proxyService, historyService });
    await server.register(oauthController, { prefix: '/api', oauthService });
    await server.register(workspaceController, { prefix: '/api', workspaceService });
    await server.register(gitController, { prefix: '/api', gitService });
    await server.register(sseTestRoutes, { prefix: '/api' });

    // Bootstrap workspace system before accepting requests
    workspaceService.bootstrap();

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
    server.log.error(err);
    process.exit(1);
  }
}

start();
