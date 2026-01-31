import { FastifyInstance } from 'fastify';
import {
  getEnvironments,
  saveEnvironment,
  deleteEnvironment,
  setActiveEnvironment,
  Environment,
} from '../database/environments';

export default async function environmentRoutes(fastify: FastifyInstance) {
  // Get all environments
  fastify.get('/environments', async (request, reply) => {
    const data = getEnvironments();
    return data;
  });

  // Create or update environment
  fastify.post<{ Body: Environment }>('/environments', async (request, reply) => {
    const environment = request.body;
    
    if (!environment.id || !environment.name) {
      return reply.code(400).send({ error: 'Environment id and name are required' });
    }
    
    saveEnvironment(environment);
    return { success: true, environment };
  });

  // Delete environment
  fastify.delete<{ Params: { id: string } }>('/environments/:id', async (request, reply) => {
    const { id } = request.params;
    const success = deleteEnvironment(id);
    
    if (!success) {
      return reply.code(400).send({ error: 'Cannot delete environment' });
    }
    
    return { success: true };
  });

  // Set active environment
  fastify.post<{ Body: { id: string } }>('/environments/active', async (request, reply) => {
    const { id } = request.body;
    const success = setActiveEnvironment(id);
    
    if (!success) {
      return reply.code(404).send({ error: 'Environment not found' });
    }
    
    return { success: true };
  });
}
