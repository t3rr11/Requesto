import { FastifyInstance } from 'fastify';
import {
  getRegistry,
  getActiveWorkspace,
  createWorkspace,
  openWorkspace,
  updateWorkspace,
  deleteWorkspace,
  setActiveWorkspace,
  exportWorkspaceData,
  importWorkspaceData,
  getWorkspacesDir,
} from '../database/workspaces';
import * as git from '../helpers/gitHelpers';

export default async function workspaceRoutes(fastify: FastifyInstance) {
  fastify.get('/workspaces', async () => {
    const registry = getRegistry();
    return registry;
  });

  fastify.get('/workspaces/active', async (_request, reply) => {
    try {
      const workspace = getActiveWorkspace();
      return workspace;
    } catch {
      return reply.code(404).send({ error: 'No active workspace' });
    }
  });

  fastify.post<{ Body: { name: string } }>('/workspaces', async (request, reply) => {
    const { name } = request.body;

    if (!name) {
      return reply.code(400).send({ error: 'Name is required' });
    }

    try {
      const workspace = createWorkspace(name);
      return workspace;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create workspace';
      return reply.code(400).send({ error: message });
    }
  });

  fastify.post<{ Body: { name: string; repoUrl: string; authToken?: string } }>('/workspaces/clone', async (request, reply) => {
    const { name, repoUrl, authToken } = request.body;

    if (!name || !repoUrl) {
      return reply.code(400).send({ error: 'Name and repository URL are required' });
    }

    try {
      const id = `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const targetPath = require('path').join(getWorkspacesDir(), id);
      await git.cloneRepo(repoUrl, targetPath, authToken);
      const workspace = openWorkspace(name, targetPath);
      return workspace;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Clone failed';
      return reply.code(500).send({ error: message });
    }
  });

  fastify.get<{ Params: { id: string } }>('/workspaces/:id/export', async (request, reply) => {
    const { id } = request.params;
    try {
      const data = exportWorkspaceData(id);
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export workspace';
      return reply.code(400).send({ error: message });
    }
  });

  fastify.post<{ Body: Record<string, unknown> }>('/workspaces/import', async (request, reply) => {
    const bundle = request.body;
    if (!bundle || typeof bundle !== 'object') {
      return reply.code(400).send({ error: 'Invalid import data' });
    }

    try {
      const workspace = importWorkspaceData(bundle);
      return workspace;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import workspace';
      return reply.code(400).send({ error: message });
    }
  });

  fastify.put<{ Params: { id: string }; Body: { name?: string } }>('/workspaces/:id', async (request, reply) => {
    const { id } = request.params;
    const { name } = request.body;

    const updated = updateWorkspace(id, { name });
    if (!updated) {
      return reply.code(404).send({ error: 'Workspace not found' });
    }

    return updated;
  });

  fastify.delete<{ Params: { id: string } }>('/workspaces/:id', async (request, reply) => {
    const { id } = request.params;

    try {
      const success = deleteWorkspace(id);
      if (!success) {
        return reply.code(404).send({ error: 'Workspace not found' });
      }
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete workspace';
      return reply.code(400).send({ error: message });
    }
  });

  fastify.post<{ Params: { id: string } }>('/workspaces/:id/activate', async (request, reply) => {
    const { id } = request.params;

    try {
      const workspace = setActiveWorkspace(id);
      return workspace;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to activate workspace';
      return reply.code(400).send({ error: message });
    }
  });

  fastify.post<{ Body: { name: string; path: string } }>('/workspaces/open', async (request, reply) => {
    const { name, path: workspacePath } = request.body;

    if (!name || !workspacePath) {
      return reply.code(400).send({ error: 'Name and path are required' });
    }

    try {
      const workspace = openWorkspace(name, workspacePath);
      return workspace;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to open workspace';
      return reply.code(400).send({ error: message });
    }
  });
}
