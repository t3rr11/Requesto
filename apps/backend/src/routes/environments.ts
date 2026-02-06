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

  // Import environment from Postman format
  fastify.post<{ Body: { environment: any } }>('/environments/import', async (request, reply) => {
    try {
      const { environment: postmanEnvironment } = request.body;
      
      if (!postmanEnvironment || !postmanEnvironment.name) {
        return reply.code(400).send({ error: 'Invalid Postman environment format' });
      }

      // Import is handled by frontend helper, backend just saves the environment
      saveEnvironment(postmanEnvironment);
      return reply.code(201).send({ success: true, environment: postmanEnvironment });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to import environment' });
    }
  });

  // Export environment
  fastify.get<{ Params: { id: string } }>('/environments/:id/export', async (request, reply) => {
    try {
      const data = getEnvironments();
      const environment = data.environments.find(env => env.id === request.params.id);
      
      if (!environment) {
        return reply.code(404).send({ error: 'Environment not found' });
      }

      return environment;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to export environment' });
    }
  });
}

