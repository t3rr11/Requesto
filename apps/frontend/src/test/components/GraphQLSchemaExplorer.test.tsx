import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GraphQLEnumType, GraphQLObjectType, GraphQLSchema, GraphQLString } from 'graphql';
import { GraphQLSchemaExplorer } from '../../components/GraphQLSchemaExplorer';

function createSchema() {
  const role = new GraphQLEnumType({
    name: 'Role',
    values: { ADMIN: {}, USER: {} },
  });
  const user = new GraphQLObjectType({
    name: 'User',
    description: 'A user account',
    fields: {
      name: { type: GraphQLString, description: 'Display name' },
      role: { type: role },
    },
  });
  return new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'Query',
      fields: { user: { type: user } },
    }),
  });
}

describe('GraphQLSchemaExplorer', () => {
  it('offers schema fetch when no schema is loaded', async () => {
    const onRefresh = vi.fn();
    const user = userEvent.setup();
    render(
      <GraphQLSchemaExplorer schema={null} loading={false} error={null} onRefresh={onRefresh} />,
    );

    await user.click(screen.getByText('Fetch schema'));
    expect(onRefresh).toHaveBeenCalledOnce();
    expect(screen.getByText('No schema loaded')).toBeInTheDocument();
  });

  it('browses root operations and schema types', async () => {
    const user = userEvent.setup();
    render(
      <GraphQLSchemaExplorer schema={createSchema()} loading={false} error={null} onRefresh={vi.fn()} />,
    );

    expect(screen.getAllByText('Query').length).toBeGreaterThan(0);
    expect(screen.getByText('user')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Search schema types'), 'User');
    await user.click(screen.getAllByRole('button', { name: 'User' })[0]);

    expect(screen.getByText('A user account')).toBeInTheDocument();
    expect(screen.getByText('Display name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'String' })).toBeInTheDocument();
  });

  it('shows endpoint errors', () => {
    render(
      <GraphQLSchemaExplorer
        schema={null}
        loading={false}
        error="Introspection is disabled"
        onRefresh={vi.fn()}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Introspection is disabled');
  });

  it('ignores nullable mutation and subscription root types', () => {
    const schema = createSchema();
    vi.spyOn(schema, 'getMutationType').mockReturnValue(null as never);
    vi.spyOn(schema, 'getSubscriptionType').mockReturnValue(null as never);

    expect(() => render(
      <GraphQLSchemaExplorer schema={schema} loading={false} error={null} onRefresh={vi.fn()} />,
    )).not.toThrow();
    expect(screen.getAllByText('Query').length).toBeGreaterThan(0);
  });
});
