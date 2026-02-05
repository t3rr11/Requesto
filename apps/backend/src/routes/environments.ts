import { FastifyInstance } from 'fastify';
import {
  getEnvironments,
  saveEnvironment,
  deleteEnvironment,
  setActiveEnvironment,
  Environment,
} from '../database/environments';

export default async function environmentRoutes(fastify: FastifyInstance) {
  fastify.get('/environments', async () => {
    const data = getEnvironments();
    return data;
  });

  fastify.post<{ Body: Environment }>('/environments', async (request, reply) => {
    const environment = request.body;
    
    if (!environment.id || !environment.name) {
      return reply.code(400).send({ error: 'Environment id and name are required' });
    }
    
    saveEnvironment(environment);
    return { success: true, environment };
  });

  fastify.delete<{ Params: { id: string } }>('/environments/:id', async (request, reply) => {
    const { id } = request.params;
    const success = deleteEnvironment(id);
    
    if (!success) {
      return reply.code(400).send({ error: 'Cannot delete environment' });
    }
    
    return { success: true };
  });

  fastify.post<{ Body: { id: string } }>('/environments/active', async (request, reply) => {
    const { id } = request.body;
    const success = setActiveEnvironment(id);
    
    if (!success) {
      return reply.code(404).send({ error: 'Environment not found' });
    }
    
    return { success: true };
  });
}
