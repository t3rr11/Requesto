import { FastifyPluginAsync } from 'fastify';
import { CollectionService } from '../services/collection.service';
import { OpenApiService } from '../services/openapi.service';
import type { AuthConfig } from '../models/proxy';
import type { SyncApplyBody } from '../models/openapi-sync';

interface Options {
  collectionService: CollectionService;
  openApiService: OpenApiService;
}

const collectionController: FastifyPluginAsync<Options> = async (server, opts) => {
  const { collectionService, openApiService } = opts;

  server.get('/collections', async () => {
    return collectionService.getAll();
  });

  server.get<{ Params: { id: string } }>('/collections/:id', async (request, _reply) => {
    const collection = await collectionService.getById(request.params.id);
    return collection;
  });

  server.post<{ Body: { name: string; description?: string } }>('/collections', async (request, reply) => {
    const { name, description } = request.body;
    if (!name || name.trim() === '') {
      return reply.code(400).send({ error: 'Collection name is required' });
    }
    const collection = await collectionService.create(name, description);
    return reply.code(201).send(collection);
  });

  server.put<{ Params: { id: string }; Body: { name?: string; description?: string } }>(
    '/collections/:id',
    async (request, _reply) => {
      const collection = await collectionService.update(request.params.id, request.body);
      return collection;
    },
  );

  server.delete<{ Params: { id: string } }>('/collections/:id', async (request, _reply) => {
    await collectionService.delete(request.params.id);
    return { success: true };
  });

  server.post<{
    Params: { id: string };
    Body: { name: string; method: string; url: string; headers?: Record<string, string>; body?: string; auth?: AuthConfig; folderId?: string };
  }>('/collections/:id/requests', async (request, reply) => {
    const { name, method, url, headers, body, auth, folderId } = request.body;
    if (!name || !method || !url) {
      return reply.code(400).send({ error: 'Name, method, and URL are required' });
    }
    const saved = await collectionService.addRequest(request.params.id, { name, method, url, headers, body, auth, folderId });
    return reply.code(201).send(saved);
  });

  server.put<{
    Params: { id: string; requestId: string };
    Body: { name?: string; method?: string; url?: string; headers?: Record<string, string>; body?: string; auth?: AuthConfig; folderId?: string };
  }>('/collections/:id/requests/:requestId', async (request, _reply) => {
    const saved = await collectionService.updateRequest(request.params.id, request.params.requestId, request.body);
    return saved;
  });

  server.delete<{ Params: { id: string; requestId: string } }>(
    '/collections/:id/requests/:requestId',
    async (request, _reply) => {
      await collectionService.deleteRequest(request.params.id, request.params.requestId);
      return { success: true };
    },
  );

  server.post<{ Params: { id: string }; Body: { name: string; parentId?: string } }>(
    '/collections/:id/folders',
    async (request, reply) => {
      const { name, parentId } = request.body;
      if (!name || name.trim() === '') {
        return reply.code(400).send({ error: 'Folder name is required' });
      }
      const saved = await collectionService.addFolder(request.params.id, { name, parentId });
      return reply.code(201).send(saved);
    },
  );

  server.put<{ Params: { id: string; folderId: string }; Body: { name?: string; parentId?: string } }>(
    '/collections/:id/folders/:folderId',
    async (request, _reply) => {
      const saved = await collectionService.updateFolder(request.params.id, request.params.folderId, request.body);
      return saved;
    },
  );

  server.delete<{ Params: { id: string; folderId: string } }>(
    '/collections/:id/folders/:folderId',
    async (request, _reply) => {
      await collectionService.deleteFolder(request.params.id, request.params.folderId);
      return { success: true };
    },
  );

  server.put<{
    Params: { id: string; requestId: string };
    Body: { targetCollectionId: string; targetFolderId?: string; targetOrder?: number };
  }>('/collections/:id/requests/:requestId/move', async (request, _reply) => {
    const { targetCollectionId, targetFolderId, targetOrder } = request.body;
    const saved = await collectionService.moveRequest({
      sourceCollectionId: request.params.id,
      requestId: request.params.requestId,
      targetCollectionId,
      targetFolderId,
      targetOrder,
    });
    return saved;
  });

  server.put<{
    Params: { id: string; folderId: string };
    Body: { targetCollectionId: string; targetParentId?: string };
  }>('/collections/:id/folders/:folderId/move', async (request, _reply) => {
    const { targetCollectionId, targetParentId } = request.body;
    const moved = await collectionService.moveFolder({
      sourceCollectionId: request.params.id,
      folderId: request.params.folderId,
      targetCollectionId,
      targetParentId,
    });
    return moved;
  });

  server.post<{ Body: { source: string; name?: string; linkSpec?: boolean } }>(
    '/collections/import-openapi',
    async (request, reply) => {
      const { source, name, linkSpec } = request.body;
      if (!source || source.trim() === '') {
        return reply.code(400).send({ error: 'OpenAPI spec source (file path or URL) is required' });
      }
      const result = await openApiService.importSpec(source, { name, linkSpec });
      return reply.code(201).send(result);
    },
  );

  server.get<{ Params: { id: string } }>('/collections/:id/export', async (request, _reply) => {
    const collection = await collectionService.getById(request.params.id);
    return collection;
  });

  server.post<{ Params: { id: string } }>('/collections/:id/sync-openapi/preview', async (request, _reply) => {
    return openApiService.previewSync(request.params.id);
  });

  server.post<{ Params: { id: string }; Body: SyncApplyBody }>(
    '/collections/:id/sync-openapi/apply',
    async (request, _reply) => {
      return openApiService.applySync(request.params.id, request.body);
    },
  );

  server.delete<{ Params: { id: string } }>('/collections/:id/openapi-link', async (request, _reply) => {
    return openApiService.unlinkSpec(request.params.id);
  });

  // Import collection from JSON (Postman format handled on frontend)
  server.post<{ Body: { collection: unknown } }>('/collections/import', async (request, reply) => {
    // The frontend sends a pre-formatted Collection object
    const col = request.body.collection as { name?: string; description?: string; folders?: unknown[]; requests?: unknown[] };
    if (!col || !col.name) {
      return reply.code(400).send({ error: 'Invalid collection format' });
    }
    const created = await collectionService.create(col.name, col.description);
    return reply.code(201).send(created);
  });
};

export default collectionController;
