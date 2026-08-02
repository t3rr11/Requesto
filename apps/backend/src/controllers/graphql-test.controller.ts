import type { FastifyPluginAsync } from 'fastify';
import { buildSchema, graphql } from 'graphql';

const schema = buildSchema(`
  type User {
    id: ID!
    name: String!
    email: String!
    role: Role!
  }

  enum Role {
    ADMIN
    MEMBER
  }

  type Query {
    users: [User!]!
    user(id: ID!): User
    fieldError: String
  }

  type Mutation {
    updateUserName(id: ID!, name: String!): User
  }
`);

const users = [
  { id: '1', name: 'Ada Lovelace', email: 'ada@example.com', role: 'ADMIN' },
  { id: '2', name: 'Grace Hopper', email: 'grace@example.com', role: 'MEMBER' },
];

const rootValue = {
  users: () => users,
  user: ({ id }: { id: string }) => users.find(user => user.id === id) ?? null,
  updateUserName: ({ id, name }: { id: string; name: string }) => {
    const user = users.find(item => item.id === id);
    return user ? { ...user, name } : null;
  },
  fieldError: () => {
    throw new Error('This field intentionally failed');
  },
};

export const graphqlTestRoutes: FastifyPluginAsync = async server => {
  server.post<{
    Body: { query?: string; variables?: Record<string, unknown>; operationName?: string };
  }>('/test/graphql', async (request, reply) => {
    if (!request.body.query) return reply.code(400).send({ error: 'GraphQL query is required' });
    return graphql({
      schema,
      source: request.body.query,
      rootValue,
      variableValues: request.body.variables,
      operationName: request.body.operationName,
    });
  });

  server.get<{
    Querystring: { query?: string; variables?: string; operationName?: string };
  }>('/test/graphql', async (request, reply) => {
    if (!request.query.query) return reply.code(400).send({ error: 'GraphQL query is required' });
    let variables: Record<string, unknown> | undefined;
    if (request.query.variables) {
      try {
        variables = JSON.parse(request.query.variables) as Record<string, unknown>;
      } catch {
        return reply.code(400).send({ error: 'GraphQL variables must be valid JSON' });
      }
    }
    return graphql({
      schema,
      source: request.query.query,
      rootValue,
      variableValues: variables,
      operationName: request.query.operationName,
    });
  });
};
