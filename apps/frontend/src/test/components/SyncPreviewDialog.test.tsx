import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SyncPreviewDialog } from '../../components/SyncPreviewDialog';
import type { SyncPreviewResult } from '../../store/collections/types';

const basePreview: SyncPreviewResult = {
  added: [],
  updated: [],
  orphaned: [],
  unchangedCount: 0,
  newSpecHash: 'abc123',
  newFolders: [],
};

describe('SyncPreviewDialog', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <SyncPreviewDialog
        isOpen={false}
        onClose={() => {}}
        preview={null}
        loading={false}
        onApply={vi.fn()}
      />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('shows loading spinner when loading', () => {
    render(
      <SyncPreviewDialog
        isOpen={true}
        onClose={() => {}}
        preview={null}
        loading={true}
        onApply={vi.fn()}
      />,
    );
    expect(screen.getByText('Checking for changes...')).toBeInTheDocument();
  });

  it('shows "No preview available" when no preview and not loading', () => {
    render(
      <SyncPreviewDialog
        isOpen={true}
        onClose={() => {}}
        preview={null}
        loading={false}
        onApply={vi.fn()}
      />,
    );
    expect(screen.getByText('No preview available.')).toBeInTheDocument();
  });

  it('shows "No changes detected" when preview has no changes', () => {
    render(
      <SyncPreviewDialog
        isOpen={true}
        onClose={() => {}}
        preview={basePreview}
        loading={false}
        onApply={vi.fn()}
      />,
    );
    expect(screen.getByText('No changes detected.')).toBeInTheDocument();
  });

  it('shows unchanged count', () => {
    render(
      <SyncPreviewDialog
        isOpen={true}
        onClose={() => {}}
        preview={{ ...basePreview, unchangedCount: 5 }}
        loading={false}
        onApply={vi.fn()}
      />,
    );
    expect(screen.getByText('5 requests unchanged')).toBeInTheDocument();
  });

  it('shows singular "request" for unchangedCount=1', () => {
    render(
      <SyncPreviewDialog
        isOpen={true}
        onClose={() => {}}
        preview={{ ...basePreview, unchangedCount: 1 }}
        loading={false}
        onApply={vi.fn()}
      />,
    );
    expect(screen.getByText('1 request unchanged')).toBeInTheDocument();
  });

  it('renders new operations section with correct heading', () => {
    const preview: SyncPreviewResult = {
      ...basePreview,
      added: [
        {
          operationId: 'deletePet',
          request: {
            id: 'r-new', name: 'Delete a pet', method: 'DELETE', url: '/pets/{{petId}}',
            collectionId: 'col1', createdAt: 0, updatedAt: 0,
          },
          folderName: 'pets',
        },
      ],
    };
    render(
      <SyncPreviewDialog
        isOpen={true}
        onClose={() => {}}
        preview={preview}
        loading={false}
        onApply={vi.fn()}
      />,
    );
    expect(screen.getByText('New (1)')).toBeInTheDocument();
    expect(screen.getByText('Delete a pet')).toBeInTheDocument();
    expect(screen.getByText('DELETE')).toBeInTheDocument();
  });

  it('renders updated operations section', () => {
    const preview: SyncPreviewResult = {
      ...basePreview,
      updated: [
        {
          requestId: 'r1',
          operationId: 'listPets',
          name: 'List Pets',
          changes: [{ field: 'method', from: 'GET', to: 'POST' }],
          mergedRequest: {
            id: 'r1', name: 'List Pets', method: 'POST', url: '/pets',
            collectionId: 'col1', createdAt: 0, updatedAt: 0,
          },
        },
      ],
    };
    render(
      <SyncPreviewDialog
        isOpen={true}
        onClose={() => {}}
        preview={preview}
        loading={false}
        onApply={vi.fn()}
      />,
    );
    expect(screen.getByText('Updated (1)')).toBeInTheDocument();
    expect(screen.getByText('List Pets')).toBeInTheDocument();
  });

  it('renders orphaned operations section', () => {
    const preview: SyncPreviewResult = {
      ...basePreview,
      orphaned: [
        { requestId: 'r2', operationId: 'oldOp', name: 'Deprecated Endpoint' },
      ],
    };
    render(
      <SyncPreviewDialog
        isOpen={true}
        onClose={() => {}}
        preview={preview}
        loading={false}
        onApply={vi.fn()}
      />,
    );
    expect(screen.getByText('Removed from spec (1)')).toBeInTheDocument();
    expect(screen.getByText('Deprecated Endpoint')).toBeInTheDocument();
  });

  it('added items are checked by default, orphaned are not', () => {
    const preview: SyncPreviewResult = {
      ...basePreview,
      added: [
        {
          operationId: 'newOp',
          request: {
            id: 'r-new', name: 'New Op', method: 'GET', url: '/new',
            collectionId: 'col1', createdAt: 0, updatedAt: 0,
          },
        },
      ],
      orphaned: [
        { requestId: 'r-old', operationId: 'oldOp', name: 'Old Op' },
      ],
    };
    render(
      <SyncPreviewDialog
        isOpen={true}
        onClose={() => {}}
        preview={preview}
        loading={false}
        onApply={vi.fn()}
      />,
    );
    const checkboxes = screen.getAllByRole('checkbox');
    // Added item should be checked
    expect(checkboxes[0]).toBeChecked();
    // Orphaned item should not be checked by default
    expect(checkboxes[1]).not.toBeChecked();
  });

  it('toggling a checkbox updates selection', async () => {
    const user = userEvent.setup();
    const preview: SyncPreviewResult = {
      ...basePreview,
      added: [
        {
          operationId: 'newOp',
          request: {
            id: 'r-new', name: 'New Op', method: 'GET', url: '/new',
            collectionId: 'col1', createdAt: 0, updatedAt: 0,
          },
        },
      ],
    };
    render(
      <SyncPreviewDialog
        isOpen={true}
        onClose={() => {}}
        preview={preview}
        loading={false}
        onApply={vi.fn()}
      />,
    );
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it('Apply Changes button calls onApply with selected items', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn().mockResolvedValue(undefined);
    const preview: SyncPreviewResult = {
      ...basePreview,
      added: [
        {
          operationId: 'deletePet',
          request: {
            id: 'r-new', name: 'Delete a pet', method: 'DELETE', url: '/pets/{{petId}}',
            collectionId: 'col1', createdAt: 0, updatedAt: 0,
          },
          folderName: 'pets',
        },
      ],
    };
    render(
      <SyncPreviewDialog
        isOpen={true}
        onClose={() => {}}
        preview={preview}
        loading={false}
        onApply={onApply}
      />,
    );

    await user.click(screen.getByText('Apply Changes'));

    expect(onApply).toHaveBeenCalledWith({
      addedOperationIds: ['deletePet'],
      updatedRequestIds: [],
      removeRequestIds: [],
    });
  });

  it('Apply Changes is disabled when nothing is selected', async () => {
    const user = userEvent.setup();
    const preview: SyncPreviewResult = {
      ...basePreview,
      added: [
        {
          operationId: 'newOp',
          request: {
            id: 'r-new', name: 'New Op', method: 'GET', url: '/new',
            collectionId: 'col1', createdAt: 0, updatedAt: 0,
          },
        },
      ],
    };
    render(
      <SyncPreviewDialog
        isOpen={true}
        onClose={() => {}}
        preview={preview}
        loading={false}
        onApply={vi.fn()}
      />,
    );
    // Uncheck the only item
    await user.click(screen.getByRole('checkbox'));
    expect(screen.getByText('Apply Changes')).toBeDisabled();
  });
});
