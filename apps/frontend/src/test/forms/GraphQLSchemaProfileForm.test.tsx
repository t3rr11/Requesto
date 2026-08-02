import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GraphQLSchemaProfileForm } from '../../forms/GraphQLSchemaProfileForm';

describe('GraphQLSchemaProfileForm', () => {
  it('creates an endpoint profile using the current request URL', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <GraphQLSchemaProfileForm
        defaultUrl="https://api.example.com/graphql"
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText('Profile name'), 'Production API');
    await user.click(screen.getByText('Create profile'));

    await vi.waitFor(() => expect(onSave).toHaveBeenCalledWith({
      name: 'Production API',
      sourceType: 'endpoint',
      sourceUrl: 'https://api.example.com/graphql',
    }));
  });

  it('accepts pasted GraphQL SDL', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <GraphQLSchemaProfileForm defaultUrl="" onSave={onSave} onCancel={vi.fn()} />,
    );

    await user.type(screen.getByLabelText('Profile name'), 'Local schema');
    await user.selectOptions(screen.getByLabelText('Schema source'), 'sdl');
    fireEvent.change(screen.getByLabelText('Schema SDL'), {
      target: { value: 'type Query { greeting: String! }' },
    });
    await user.click(screen.getByText('Create profile'));

    await vi.waitFor(() => expect(onSave).toHaveBeenCalledWith({
      name: 'Local schema',
      sourceType: 'sdl',
      content: 'type Query { greeting: String! }',
    }));
  });

  it('shows profile API errors without closing the form', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockRejectedValue(new Error('Invalid GraphQL SDL'));
    render(
      <GraphQLSchemaProfileForm defaultUrl="" onSave={onSave} onCancel={vi.fn()} />,
    );

    await user.type(screen.getByLabelText('Profile name'), 'Broken schema');
    await user.selectOptions(screen.getByLabelText('Schema source'), 'sdl');
    fireEvent.change(screen.getByLabelText('Schema SDL'), { target: { value: 'type Query {' } });
    await user.click(screen.getByText('Create profile'));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid GraphQL SDL');
  });
});
