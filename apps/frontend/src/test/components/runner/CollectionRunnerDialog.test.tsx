import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CollectionRunnerDialog } from '../../../components/CollectionRunnerDialog';
import type { Collection } from '../../../store/collections/types';

vi.mock('../../../store/environments/store', () => ({
  useEnvironmentStore: () => ({
    environmentsData: { activeEnvironmentId: null, environments: [] },
    updateCurrentValues: vi.fn(),
  }),
}));

vi.mock('../../../store/request/store', () => ({
  useRequestStore: () => ({ sendRequest: vi.fn() }),
}));

function makeCollections(): Collection[] {
  return [
    {
      id: 'col-1',
      name: 'First',
      folders: [{ id: 'f-1', name: 'Users', collectionId: 'col-1' }],
      requests: [
        { id: 'r-1', name: 'Root Request', method: 'GET', url: '/', collectionId: 'col-1' },
        { id: 'r-2', name: 'Nested Request', method: 'GET', url: '/', collectionId: 'col-1', folderId: 'f-1' },
      ],
    },
    {
      id: 'col-2',
      name: 'Second',
      folders: [],
      requests: [{ id: 'r-3', name: 'Other Request', method: 'GET', url: '/', collectionId: 'col-2' }],
    },
  ];
}

describe('CollectionRunnerDialog (multi-collection)', () => {
  it('renders every request under its collection and folder headers', () => {
    render(<CollectionRunnerDialog isOpen onClose={() => {}} collections={makeCollections()} />);

    expect(screen.getByText('Run: All Collections')).toBeInTheDocument();
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.getByText('Root Request')).toBeInTheDocument();
    expect(screen.getByText('Nested Request')).toBeInTheDocument();
    expect(screen.getByText('Other Request')).toBeInTheDocument();
    expect(screen.getByText('3 requests')).toBeInTheDocument();
  });

  it('shows requests that arrive after mount (collections loaded late)', () => {
    const { rerender } = render(<CollectionRunnerDialog isOpen onClose={() => {}} collections={[]} />);

    // The sidebar renders the dialog even when closed and the store's
    // collections can still be empty — nothing may crash here.
    expect(screen.queryByText('Root Request')).not.toBeInTheDocument();

    rerender(<CollectionRunnerDialog isOpen onClose={() => {}} collections={makeCollections()} />);

    // Regression: result entries must sync with the late-arriving list, or the
    // rows silently disappear (folders rendered, requests did not).
    expect(screen.getByText('Root Request')).toBeInTheDocument();
    expect(screen.getByText('Nested Request')).toBeInTheDocument();
    expect(screen.getByText('Other Request')).toBeInTheDocument();
  });

  it('renders a single collection without group headers', () => {
    render(
      <CollectionRunnerDialog isOpen onClose={() => {}} collections={[makeCollections()[0]]} />,
    );

    expect(screen.getByText('Run: First')).toBeInTheDocument();
    expect(screen.queryByText('First')).not.toBeInTheDocument(); // no group header
    expect(screen.getByText('Root Request')).toBeInTheDocument();
  });
});
