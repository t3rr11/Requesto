import Fastify, { type FastifyInstance, LogController } from 'fastify';
import cors from '@fastify/cors';
import path from 'node:path';

import { sseTestRoutes } from './controllers/sse-test.controller';
import { graphqlTestRoutes } from './controllers/graphql-test.controller';
import { registerErrorHandler } from './errors/error-handler';
import { registerEmptyBodyParser } from './utils/empty-body-parser';

// Repositories
import { CollectionRepository } from './repositories/collection.repository';
import { EnvironmentRepository } from './repositories/environment.repository';
import { EnvironmentLocalRepository } from './repositories/environment-local.repository';
import { OAuthRepository } from './repositories/oauth.repository';
import { WorkspaceRepository } from './repositories/workspace.repository';
import { HistoryRepository } from './repositories/history.repository';
import { GraphQLSchemaProfileRepository } from './repositories/graphql-schema-profile.repository';
import { GraphQLSchemaCacheRepository } from './repositories/graphql-schema-cache.repository';

// Services
import { CollectionService } from './services/collection.service';
import { EnvironmentService } from './services/environment.service';
import { HistoryService } from './services/history.service';
import { OAuthService } from './services/oauth.service';
import { ProxyService } from './services/proxy.service';
import { WorkspaceService } from './services/workspace.service';
import { GitService } from './services/git.service';
import { OpenApiService } from './services/openapi.service';
import { GraphQLSchemaProfileService } from './services/graphql-schema-profile.service';

// Controllers
import collectionController from './controllers/collection.controller';
import environmentController from './controllers/environment.controller';
import proxyController from './controllers/proxy.controller';
import oauthController from './controllers/oauth.controller';
import workspaceController from './controllers/workspace.controller';
import gitController from './controllers/git.controller';
import graphqlSchemaProfileController from './controllers/graphql-schema-profile.controller';

export type AppOptions = {
  /**
   * Root data directory. Workspaces live at `<dataDir>/workspaces/<id>` and
   * the registry at `<dataDir>/workspaces.json`.
   */
  dataDir: string;
  /** Fastify log level. Defaults to "warn" so embedded instances stay quiet. */
  logLevel?: string;
  /** Allowed CORS origins. Defaults to the development origins used by the app. */
  corsOrigins?: Array<string | RegExp>;
  /**
   * When set, the built frontend is served from this directory and unknown
   * non-API routes fall back to index.html. Used by the production server
   * entry; embedded instances leave it unset.
   */
  staticRoot?: string;
};

/**
 * Build a fully-wired Fastify instance (repositories, services, controllers)
 * around the given data directory. The normal server entry and the embedded
 * scratch server used by the CLI both go through this factory.
 */
export async function buildApp(options: AppOptions): Promise<FastifyInstance> {
  const dataDir = options.dataDir;
  const corsOrigins = options.corsOrigins ?? [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:4747',
    /^file:\/\//,
  ];

  const workspacesDir = path.join(dataDir, 'workspaces');
  const workspacesFile = path.join(dataDir, 'workspaces.json');

  // Instantiate repository layer
  const workspaceRepo = new WorkspaceRepository(dataDir, workspacesDir, workspacesFile);
  const workspaceService = new WorkspaceService(workspaceRepo);

  // Repositories that need the active workspace's data dir
  const getDataDir = () => workspaceRepo.getDataDir();
  const getLocalDir = () => workspaceRepo.getLocalDir();

  const collectionRepo = new CollectionRepository(getDataDir);
  const environmentRepo = new EnvironmentRepository(getDataDir, getLocalDir);
  const environmentLocalRepo = new EnvironmentLocalRepository(getLocalDir);
  const oauthRepo = new OAuthRepository(getDataDir, getLocalDir);
  const historyRepo = new HistoryRepository(getLocalDir);
  const graphqlSchemaProfileRepo = new GraphQLSchemaProfileRepository(getDataDir);
  const graphqlSchemaCacheRepo = new GraphQLSchemaCacheRepository(getLocalDir);

  // Instantiate service layer
  const collectionService = new CollectionService(collectionRepo);
  const environmentService = new EnvironmentService(environmentRepo, environmentLocalRepo);
  const historyService = new HistoryService(historyRepo);
  const oauthService = new OAuthService(oauthRepo);
  const proxyService = new ProxyService(environmentService, historyService, oauthService);
  const gitService = new GitService(workspaceService);
  const openApiService = new OpenApiService(collectionService, environmentService);
  const graphqlSchemaProfileService = new GraphQLSchemaProfileService(
    graphqlSchemaProfileRepo,
    graphqlSchemaCacheRepo,
  );

  const server = Fastify({
    logger: {
      level: options.logLevel ?? 'warn',
    },
    logController: new LogController({
      disableRequestLogging: false,
    }),
    requestIdHeader: 'x-request-id',
  });

  await server.register(cors, {
    origin: (origin, callback) => {
      if (!origin || corsOrigins.some((allowed) =>
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
  registerEmptyBodyParser(server);

  await server.register(collectionController, { prefix: '/api', collectionService, openApiService });
  await server.register(environmentController, { prefix: '/api', environmentService });
  await server.register(proxyController, { prefix: '/api', proxyService, historyService });
  await server.register(oauthController, { prefix: '/api', oauthService });
  await server.register(workspaceController, { prefix: '/api', workspaceService });
  await server.register(gitController, { prefix: '/api', gitService });
  await server.register(graphqlSchemaProfileController, { prefix: '/api', graphqlSchemaProfileService });
  await server.register(sseTestRoutes, { prefix: '/api' });
  await server.register(graphqlTestRoutes, { prefix: '/api' });

  // Bootstrap workspace system before accepting requests
  workspaceService.bootstrap();

  server.get('/health', async () => {
    return { status: 'ok' };
  });

  if (options.staticRoot) {
    const fastifyStatic = await import('@fastify/static');
    await server.register(fastifyStatic.default, {
      root: options.staticRoot,
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

  return server;
}
