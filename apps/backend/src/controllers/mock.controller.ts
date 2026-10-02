import { FastifyPluginCallback } from 'fastify';
import { MockService } from '../services/mock.service';
import {
  createMockEndpointSchema,
  updateMockEndpointSchema,
  reorderMockEndpointsSchema,
  startMockServerSchema,
  mockDatasetSchema,
} from '../dtos/mock.dto';

interface Options {
  mockService: MockService;
}

const mockController: FastifyPluginCallback<Options> = (server, opts) => {
  const { mockService } = opts;

  server.get('/mock/status', async (_request, _reply) => {
    return mockService.getStatus();
  });

  server.post<{ Body: { port?: number } }>('/mock/start', async (request, _reply) => {
    const { port } = startMockServerSchema.parse(request.body ?? {});
    return mockService.start(port);
  });

  server.post('/mock/stop', async (_request, _reply) => {
    return mockService.stop();
  });

  server.get('/mock/endpoints', async (_request, _reply) => {
    return mockService.getAll();
  });

  server.post<{ Body: unknown }>('/mock/endpoints', async (request, reply) => {
    const data = createMockEndpointSchema.parse(request.body);
    const created = await mockService.create(data);
    return reply.code(201).send(created);
  });

  server.put<{ Params: { id: string }; Body: unknown }>('/mock/endpoints/:id', async (request, _reply) => {
    const data = updateMockEndpointSchema.parse(request.body);
    return mockService.update(request.params.id, data);
  });

  server.delete<{ Params: { id: string } }>('/mock/endpoints/:id', async (request, _reply) => {
    await mockService.delete(request.params.id);
    return { success: true };
  });

  server.post<{ Params: { id: string } }>('/mock/endpoints/:id/duplicate', async (request, reply) => {
    const created = await mockService.duplicate(request.params.id);
    return reply.code(201).send(created);
  });

  server.get<{ Params: { id: string } }>('/mock/endpoints/:id/data', async (request, _reply) => {
    await mockService.getById(request.params.id);
    return mockService.getDataset(request.params.id);
  });

  server.put<{ Params: { id: string }; Body: unknown }>('/mock/endpoints/:id/data', async (request, _reply) => {
    const records = mockDatasetSchema.parse(request.body);
    await mockService.updateDataset(request.params.id, records);
    return { success: true };
  });

  server.put<{ Body: unknown }>('/mock/endpoints/reorder', async (request, _reply) => {
    const { ids } = reorderMockEndpointsSchema.parse(request.body);
    await mockService.reorder(ids);
    return { success: true };
  });

  server.delete<{ Params: { id: string } }>('/mock/endpoints/:id/data', async (request, _reply) => {
    await mockService.clearDataset(request.params.id);
    return { success: true };
  });

  server.get('/mock/logs', async (_request, _reply) => {
    return mockService.getLogs();
  });

  server.delete('/mock/logs', async (_request, _reply) => {
    mockService.clearLogs();
    return { success: true };
  });
};

export default mockController;
