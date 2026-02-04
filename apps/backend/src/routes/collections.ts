import { FastifyPluginAsync } from 'fastify';
import { collectionsDb } from '../database/collections';
import { AuthConfig } from '../types';

const collectionsRoutes: FastifyPluginAsync = async (server) => {
  // Get all collections
  server.get('/collections', async (_request, reply) => {
    try {
      const collections = await collectionsDb.getAll();
      return collections;
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch collections' });
    }
  });

  // Get a single collection
  server.get<{ Params: { id: string } }>('/collections/:id', async (request, reply) => {
    try {
      const collection = await collectionsDb.getById(request.params.id);
      if (!collection) {
        return reply.code(404).send({ error: 'Collection not found' });
      }
      return collection;
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch collection' });
    }
  });

  // Create a new collection
  server.post<{
    Body: {
      name: string;
      description?: string;
    };
  }>('/collections', async (request, reply) => {
    try {
      const { name, description } = request.body;
      
      if (!name || name.trim() === '') {
        return reply.code(400).send({ error: 'Collection name is required' });
      }

      const newCollection = {
        id: `col-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        name: name.trim(),
        description,
        folders: [],
        requests: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const collection = await collectionsDb.create(newCollection);
      return reply.code(201).send(collection);
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({ error: 'Failed to create collection' });
    }
  });

  // Update a collection
  server.put<{
    Params: { id: string };
    Body: {
      name?: string;
      description?: string;
    };
  }>('/collections/:id', async (request, reply) => {
    try {
      const updates = request.body;
      const collection = await collectionsDb.update(request.params.id, updates);
      
      if (!collection) {
        return reply.code(404).send({ error: 'Collection not found' });
      }

      return collection;
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({ error: 'Failed to update collection' });
    }
  });

  // Delete a collection
  server.delete<{ Params: { id: string } }>('/collections/:id', async (request, reply) => {
    try {
      const deleted = await collectionsDb.delete(request.params.id);
      
      if (!deleted) {
        return reply.code(404).send({ error: 'Collection not found' });
      }

      return { success: true };
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({ error: 'Failed to delete collection' });
    }
  });

  // Add a request to a collection
  server.post<{
    Params: { id: string };
    Body: {
      name: string;
      method: string;
      url: string;
      headers?: Record<string, string>;
      body?: string;
      auth?: AuthConfig;
      folderId?: string;
    };
  }>('/collections/:id/requests', async (request, reply) => {
    try {
      const { name, method, url, headers, body, auth, folderId } = request.body;

      if (!name || !method || !url) {
        return reply.code(400).send({ error: 'Name, method, and URL are required' });
      }

      const newRequest = {
        id: `req-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        name: name.trim(),
        method: method.toUpperCase(),
        url: url.trim(),
        headers,
        body,
        auth,
        folderId,
        collectionId: request.params.id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const savedRequest = await collectionsDb.addRequest(request.params.id, newRequest);
      
      if (!savedRequest) {
        return reply.code(404).send({ error: 'Collection not found' });
      }

      return reply.code(201).send(savedRequest);
    } catch (error) {
      server.log.error(error);
      reply.code(500).send({ error: 'Failed to add request to collection' });
    }
  });

  // Update a request in a collection
  server.put<{
    Params: { id: string; requestId: string };
    Body: {
      name?: string;
      method?: string;
      url?: string;
      headers?: Record<string, string>;
      body?: string;
      auth?: AuthConfig;
      folderId?: string;
    };
  }>('/collections/:id/requests/:requestId', async (request, reply) => {
    try {
      const updates = request.body;
      const savedRequest = await collectionsDb.updateRequest(
        request.params.id,
        request.params.requestId,
        updates
      );

      if (!savedRequest) {
        return reply.code(404).send({ error: 'Collection or request not found' });
      }

      return savedRequest;
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({ error: 'Failed to update request' });
    }
  });

  // Delete a request from a collection
  server.delete<{
    Params: { id: string; requestId: string };
  }>('/collections/:id/requests/:requestId', async (request, reply) => {
    try {
      const deleted = await collectionsDb.deleteRequest(
        request.params.id,
        request.params.requestId
      );

      if (!deleted) {
        return reply.code(404).send({ error: 'Collection or request not found' });
      }

      return { success: true };
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({ error: 'Failed to delete request' });
    }
  });

  // Folder operations

  // Add a folder to a collection
  server.post<{
    Params: { id: string };
    Body: {
      name: string;
      parentId?: string;
    };
  }>('/collections/:id/folders', async (request, reply) => {
    try {
      const { name, parentId } = request.body;

      if (!name || name.trim() === '') {
        return reply.code(400).send({ error: 'Folder name is required' });
      }

      const newFolder = {
        id: `folder-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        name: name.trim(),
        parentId,
        collectionId: request.params.id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const savedFolder = await collectionsDb.addFolder(request.params.id, newFolder);
      
      if (!savedFolder) {
        return reply.code(404).send({ error: 'Collection not found' });
      }

      return reply.code(201).send(savedFolder);
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({ error: 'Failed to add folder to collection' });
    }
  });

  // Update a folder in a collection
  server.put<{
    Params: { id: string; folderId: string };
    Body: {
      name?: string;
      parentId?: string;
    };
  }>('/collections/:id/folders/:folderId', async (request, reply) => {
    try {
      const updates = request.body;
      const savedFolder = await collectionsDb.updateFolder(
        request.params.id,
        request.params.folderId,
        updates
      );

      if (!savedFolder) {
        return reply.code(404).send({ error: 'Collection or folder not found' });
      }

      return savedFolder;
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({ error: 'Failed to update folder' });
    }
  });

  // Delete a folder from a collection
  server.delete<{
    Params: { id: string; folderId: string };
  }>('/collections/:id/folders/:folderId', async (request, reply) => {
    try {
      const deleted = await collectionsDb.deleteFolder(
        request.params.id,
        request.params.folderId
      );

      if (!deleted) {
        return reply.code(404).send({ error: 'Collection or folder not found' });
      }

      return { success: true };
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({ error: 'Failed to delete folder' });
    }
  });

  // Move a request to a different collection/folder
  server.put<{
    Params: { id: string; requestId: string };
    Body: {
      targetCollectionId: string;
      targetFolderId?: string;
      targetOrder?: number;
    };
  }>('/collections/:id/requests/:requestId/move', async (request, reply) => {
    try {
      const { targetCollectionId, targetFolderId, targetOrder } = request.body;
      const sourceCollectionId = request.params.id;
      const requestId = request.params.requestId;

      // Get the source collection and request
      const sourceCollection = await collectionsDb.getById(sourceCollectionId);
      if (!sourceCollection) {
        return reply.code(404).send({ error: 'Source collection not found' });
      }

      const requestToMove = sourceCollection.requests.find(r => r.id === requestId);
      if (!requestToMove) {
        return reply.code(404).send({ error: 'Request not found' });
      }

      // Remove from source
      await collectionsDb.deleteRequest(sourceCollectionId, requestId);

      // Get target collection to determine order
      const targetCollection = await collectionsDb.getById(targetCollectionId);
      if (!targetCollection) {
        return reply.code(404).send({ error: 'Target collection not found' });
      }

      // Calculate order for the request
      let order = targetOrder;
      if (order === undefined) {
        // If no specific order, place at end
        const targetRequests = targetCollection.requests.filter(r => r.folderId === targetFolderId);
        order = targetRequests.length > 0 ? Math.max(...targetRequests.map(r => r.order || 0)) + 1 : 0;
      } else {
        // Reorder existing requests in the target location
        const targetRequests = targetCollection.requests.filter(r => r.folderId === targetFolderId);
        for (const req of targetRequests) {
          if ((req.order || 0) >= order) {
            await collectionsDb.updateRequest(targetCollectionId, req.id, { order: (req.order || 0) + 1 });
          }
        }
      }

      // Add to target with new collectionId, folderId, and order
      const movedRequest = {
        ...requestToMove,
        collectionId: targetCollectionId,
        folderId: targetFolderId,
        order,
        updatedAt: Date.now(),
      };

      const savedRequest = await collectionsDb.addRequest(targetCollectionId, movedRequest);
      
      if (!savedRequest) {
        return reply.code(404).send({ error: 'Target collection not found' });
      }

      return savedRequest;
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({ error: 'Failed to move request' });
    }
  });

  // Move a folder to a different collection/parent
  server.put<{
    Params: { id: string; folderId: string };
    Body: {
      targetCollectionId: string;
      targetParentId?: string;
    };
  }>('/collections/:id/folders/:folderId/move', async (request, reply) => {
    try {
      const { targetCollectionId, targetParentId } = request.body;
      const sourceCollectionId = request.params.id;
      const folderId = request.params.folderId;

      // Get the source collection and folder
      const sourceCollection = await collectionsDb.getById(sourceCollectionId);
      if (!sourceCollection) {
        return reply.code(404).send({ error: 'Source collection not found' });
      }

      const folderToMove = sourceCollection.folders?.find(f => f.id === folderId);
      if (!folderToMove) {
        return reply.code(404).send({ error: 'Folder not found' });
      }

      // Prevent moving a folder into itself or its descendants
      if (targetParentId) {
        let checkParent = sourceCollection.folders?.find(f => f.id === targetParentId);
        while (checkParent) {
          if (checkParent.id === folderId) {
            return reply.code(400).send({ error: 'Cannot move a folder into itself or its descendants' });
          }
          checkParent = sourceCollection.folders?.find(f => f.id === checkParent?.parentId);
        }
      }

      // Get all descendants of this folder (recursively)
      const getDescendantIds = (parentId: string): string[] => {
        const children = sourceCollection.folders?.filter(f => f.parentId === parentId) || [];
        return children.flatMap(child => [child.id, ...getDescendantIds(child.id)]);
      };
      const descendantIds = [folderId, ...getDescendantIds(folderId)];

      // Get all requests in this folder and descendants
      const requestsToMove = sourceCollection.requests.filter(r => 
        r.folderId && descendantIds.includes(r.folderId)
      );

      // Remove folder and descendants from source
      await collectionsDb.deleteFolder(sourceCollectionId, folderId);

      // Get folders to move (folder + all descendants)
      const foldersToMove = [
        folderToMove,
        ...sourceCollection.folders?.filter(f => descendantIds.includes(f.id)) || []
      ];

      // Add to target collection
      const movedFolder = {
        ...folderToMove,
        collectionId: targetCollectionId,
        parentId: targetParentId,
        updatedAt: Date.now(),
      };

      const savedFolder = await collectionsDb.addFolder(targetCollectionId, movedFolder);
      
      if (!savedFolder) {
        return reply.code(404).send({ error: 'Target collection not found' });
      }

      // Add all descendant folders
      for (const folder of foldersToMove.filter(f => f.id !== folderId)) {
        await collectionsDb.addFolder(targetCollectionId, {
          ...folder,
          collectionId: targetCollectionId,
          updatedAt: Date.now(),
        });
      }

      // Move all requests
      for (const req of requestsToMove) {
        await collectionsDb.addRequest(targetCollectionId, {
          ...req,
          collectionId: targetCollectionId,
          updatedAt: Date.now(),
        });
      }

      return savedFolder;
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({ error: 'Failed to move folder' });
    }
  });
};

export default collectionsRoutes;
