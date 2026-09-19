import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RequestItem } from '../../components/sidebar/RequestItem';
import type { SavedRequest } from '../../store/collections/types';

vi.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: () => undefined } },
}));

function createRequest(overrides: Partial<SavedRequest> = {}): SavedRequest {
  return {
    id: 'request-1',
    name: 'Users',
    method: 'POST',
    url: 'https://api.example.com',
    collectionId: 'collection-1',
    ...overrides,
  };
}

function renderRequest(request: SavedRequest) {
  return render(
    <RequestItem
      request={request}
      collectionId="collection-1"
      isActive={false}
      isSelected={false}
      onSelect={vi.fn()}
      onContextMenu={vi.fn()}
      onDelete={vi.fn()}
    />,
  );
}

describe('RequestItem', () => {
  it('shows GraphQL identity alongside the operation badge for GraphQL requests', () => {
    renderRequest(createRequest({ requestType: 'graphql' }));

    expect(screen.getByLabelText('GraphQL request')).toBeInTheDocument();
    expect(screen.getByText('Query')).toBeInTheDocument();
    expect(screen.queryByText('POST')).not.toBeInTheDocument();
  });

  it('shows the Mutation badge when the saved document declares a mutation', () => {
    renderRequest(
      createRequest({
        requestType: 'graphql',
        graphql: { document: 'mutation CreateUser { createUser { id } }', variables: '', transport: 'post' },
      }),
    );

    expect(screen.getByText('Mutation')).toBeInTheDocument();
  });

  it('defaults to Query when the saved document is empty or unparseable', () => {
    renderRequest(createRequest({ requestType: 'graphql', graphql: { document: '{ user {', variables: '', transport: 'post' } }));

    expect(screen.getByText('Query')).toBeInTheDocument();
  });

  it('does not show the GraphQL icon for HTTP requests', () => {
    renderRequest(createRequest({ requestType: 'http', method: 'GET' }));

    expect(screen.queryByLabelText('GraphQL request')).not.toBeInTheDocument();
    expect(screen.getByText('GET')).toBeInTheDocument();
  });
});
