import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RequestBreadcrumb } from '../../components/RequestBreadcrumb';

vi.mock('../../store/collections/store', () => ({
  useCollectionsStore: () => ({
    collections: [
      {
        id: 'col-1',
        name: 'My API',
        folders: [{ id: 'fol-1', name: 'Users', collectionId: 'col-1' }],
        requests: [
          { id: 'req-1', name: 'Get User', method: 'GET', url: '/users', collectionId: 'col-1', folderId: 'fol-1' },
          { id: 'req-2', name: 'Create Post', method: 'POST', url: '/posts', collectionId: 'col-1' },
        ],
      },
    ],
  }),
}));

describe('RequestBreadcrumb', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders breadcrumb for request in collection', () => {
    render(<RequestBreadcrumb savedRequestId="req-1" />);
    expect(screen.getByText('My API')).toBeInTheDocument();
    expect(screen.getByText('Get User')).toBeInTheDocument();
  });

  it('renders breadcrumb for another request in same collection', () => {
    render(<RequestBreadcrumb savedRequestId="req-2" />);
    expect(screen.getByText('My API')).toBeInTheDocument();
    expect(screen.getByText('Create Post')).toBeInTheDocument();
  });

  it('renders untitled request when no savedRequestId', () => {
    render(<RequestBreadcrumb savedRequestId={undefined} />);
    expect(screen.getByText('Untitled Request')).toBeInTheDocument();
  });

  it('renders untitled request when request not found', () => {
    render(<RequestBreadcrumb savedRequestId="nonexistent" />);
    expect(screen.getByText('Untitled Request')).toBeInTheDocument();
  });

  it('always shows Collections breadcrumb root', () => {
    render(<RequestBreadcrumb savedRequestId={undefined} />);
    expect(screen.getByText('Collections')).toBeInTheDocument();
  });
});
