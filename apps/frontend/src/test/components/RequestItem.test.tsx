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
  it('shows GraphQL identity alongside the HTTP transport method', () => {
    renderRequest(createRequest({ requestType: 'graphql' }));

    expect(screen.getByLabelText('GraphQL request')).toBeInTheDocument();
    expect(screen.getByText('POST')).toBeInTheDocument();
  });

  it('does not show the GraphQL icon for HTTP requests', () => {
    renderRequest(createRequest({ requestType: 'http', method: 'GET' }));

    expect(screen.queryByLabelText('GraphQL request')).not.toBeInTheDocument();
    expect(screen.getByText('GET')).toBeInTheDocument();
  });
});
