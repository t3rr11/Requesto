import { FastifyPluginAsync } from 'fastify';
import { WorkspaceService } from '../services/workspace.service';

interface Options {
  workspaceService: WorkspaceService;
}

const workspaceController: FastifyPluginAsync<Options> = async (server, opts) => {
  const { workspaceService } = opts;

  server.get('/workspaces', async () => {
    return workspaceService.getAll();
  });

  server.get('/workspaces/active', async () => {
    return workspaceService.getActive();
  });

  server.post<{ Body: { name: string } }>('/workspaces', async (request, reply) => {
    const { name } = request.body;
    if (!name) {
      return reply.code(400).send({ error: 'Name is required' });
    }
    const workspace = workspaceService.create(name);
    return workspace;
  });

  server.post<{ Body: { name: string; repoUrl: string; authToken?: string } }>(
    '/workspaces/clone',
    async (request, reply) => {
      const { name, repoUrl, authToken } = request.body;
      if (!name || !repoUrl) {
        return reply.code(400).send({ error: 'Name and repository URL are required' });
      }
      const workspace = await workspaceService.clone(name, repoUrl, authToken);
      return workspace;
    },
  );

  server.post<{ Body: { name: string; path: string } }>('/workspaces/open', async (request, reply) => {
    const { name, path: workspacePath } = request.body;
    if (!name || !workspacePath) {
      return reply.code(400).send({ error: 'Name and path are required' });
    }
    return workspaceService.open(name, workspacePath);
  });

  server.post<{ Body: Record<string, unknown> }>('/workspaces/import', async (request, reply) => {
    const bundle = request.body;
    if (!bundle || typeof bundle !== 'object') {
      return reply.code(400).send({ error: 'Invalid import data' });
    }
    return workspaceService.importData(bundle);
  });

  server.get<{ Params: { id: string } }>('/workspaces/:id/export', async (request, _reply) => {
    return workspaceService.exportData(request.params.id);
  });

  server.put<{ Params: { id: string }; Body: { name?: string } }>(
    '/workspaces/:id',
    async (request, _reply) => {
      return workspaceService.update(request.params.id, request.body);
    },
  );

  server.delete<{ Params: { id: string } }>('/workspaces/:id', async (request, _reply) => {
    workspaceService.delete(request.params.id);
    return { success: true };
  });

  server.post<{ Params: { id: string } }>('/workspaces/:id/activate', async (request, _reply) => {
    return workspaceService.setActive(request.params.id);
  });
};

export default workspaceController;
