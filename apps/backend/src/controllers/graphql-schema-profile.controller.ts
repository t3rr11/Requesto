import type { FastifyPluginAsync } from 'fastify';
import type { CreateGraphQLSchemaProfile } from '../models/graphql-schema-profile';
import { GraphQLSchemaProfileService } from '../services/graphql-schema-profile.service';
import { graphqlSchemaCacheInputSchema, graphqlSchemaProfileInputSchema } from '../dtos/graphql-schema-profile.dto';

interface Options {
  graphqlSchemaProfileService: GraphQLSchemaProfileService;
}

const graphqlSchemaProfileController: FastifyPluginAsync<Options> = async (server, options) => {
  const { graphqlSchemaProfileService } = options;

  server.get('/graphql/schema-profiles', async () => graphqlSchemaProfileService.getAll());

  server.get<{ Params: { id: string } }>('/graphql/schema-profiles/:id', async request =>
    graphqlSchemaProfileService.getById(request.params.id),
  );

  server.post<{ Body: CreateGraphQLSchemaProfile }>('/graphql/schema-profiles', async (request, reply) => {
    const profile = graphqlSchemaProfileService.create(graphqlSchemaProfileInputSchema.parse(request.body));
    return reply.code(201).send(profile);
  });

  server.put<{ Params: { id: string }; Body: CreateGraphQLSchemaProfile }>(
    '/graphql/schema-profiles/:id',
    async request => graphqlSchemaProfileService.update(
      request.params.id,
      graphqlSchemaProfileInputSchema.parse(request.body),
    ),
  );

  server.delete<{ Params: { id: string } }>('/graphql/schema-profiles/:id', async request => {
    graphqlSchemaProfileService.delete(request.params.id);
    return { success: true };
  });

  server.get<{ Params: { id: string } }>('/graphql/schema-profiles/:id/cache', async request => ({
    cache: graphqlSchemaProfileService.getCache(request.params.id),
  }));

  server.put<{
    Params: { id: string };
    Body: { sourceUrl: string; introspection: unknown };
  }>('/graphql/schema-profiles/:id/cache', async request => {
    const input = graphqlSchemaCacheInputSchema.parse(request.body);
    return {
      cache: graphqlSchemaProfileService.saveCache(
        request.params.id,
        input.sourceUrl,
        input.introspection,
      ),
    };
  });
};

export default graphqlSchemaProfileController;
