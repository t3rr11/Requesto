import { FastifyPluginAsync } from 'fastify';
import { EnvironmentService } from '../services/environment.service';
import type { Environment } from '../models/environment';

interface Options {
  environmentService: EnvironmentService;
}

const environmentController: FastifyPluginAsync<Options> = async (server, opts) => {
  const { environmentService } = opts;

  server.get('/environments', async () => {
    return environmentService.getAll();
  });

  server.post<{ Body: Environment }>('/environments', async (request, reply) => {
    const environment = request.body;
    if (!environment.id || !environment.name) {
      return reply.code(400).send({ error: 'Environment id and name are required' });
    }
    const saved = environmentService.save(environment);
    return { success: true, environment: saved };
  });

  server.delete<{ Params: { id: string } }>('/environments/:id', async (request, _reply) => {
    environmentService.delete(request.params.id);
    return { success: true };
  });

  server.post<{ Body: { id: string } }>('/environments/active', async (request, _reply) => {
    const { id } = request.body;
    environmentService.setActive(id);
    return { success: true };
  });

  server.post<{ Body: { environment: Environment } }>('/environments/import', async (request, reply) => {
    const { environment: env } = request.body;
    if (!env || !env.name) {
      return reply.code(400).send({ error: 'Invalid environment format' });
    }
    environmentService.save(env);
    return reply.code(201).send({ success: true, environment: env });
  });

  server.get<{ Params: { id: string } }>('/environments/:id/export', async (request, reply) => {
    const data = environmentService.getAll();
    const environment = data.environments.find((e) => e.id === request.params.id);
    if (!environment) {
      return reply.code(404).send({ error: 'Environment not found' });
    }
    return environment;
  });

  /**
   * PATCH /environments/:id/current-values
   * Merge runtime overrides into the local sidecar (never committed to git).
   * Body: `{ overrides: Record<string, string> }`
   */
  server.patch<{ Params: { id: string }; Body: { overrides: Record<string, string> } }>(
    '/environments/:id/current-values',
    async (request, _reply) => {
      environmentService.setCurrentValues(request.params.id, request.body.overrides);
      return { success: true };
    },
  );

  /**
   * DELETE /environments/:id/current-values
   * Reset all current values back to initial for the given environment.
   * Optionally scope to a single key via `?key=variableName`.
   */
  server.delete<{ Params: { id: string }; Querystring: { key?: string } }>(
    '/environments/:id/current-values',
    async (request, _reply) => {
      const { key } = request.query;
      if (key) {
        environmentService.resetCurrentValue(request.params.id, key);
      } else {
        environmentService.resetCurrentValues(request.params.id);
      }
      return { success: true };
    },
  );
};

export default environmentController;
