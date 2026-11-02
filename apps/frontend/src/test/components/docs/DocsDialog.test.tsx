import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { Collection, SavedRequest } from '../../../store/collections/types';
import { DocsDialog } from '../../../components/docs/DocsDialog';
import { buildDocsSections, buildDocsTree } from '../../../components/docs/DocsTreeHelpers';
import { DocsTree } from '../../../components/docs/DocsTree';
import { saveStagedDocs } from '../../../components/docs/SaveDocs';

const { mocks } = vi.hoisted(() => ({
  mocks: {
    collections: [] as unknown[],
    updateRequest: vi.fn(),
    updateCollection: vi.fn(),
    showAlert: vi.fn(),
  },
}));

vi.mock('../../../store/collections/store', () => ({
  // Zustand-style hook: DocsDialog uses selectors, so honor them.
  useCollectionsStore: Object.assign(
    (selector?: (state: unknown) => unknown) => {
      const state = { collections: mocks.collections, updateCollection: mocks.updateCollection, updateRequest: mocks.updateRequest };
      return selector ? selector(state) : state;
    },
    { getState: () => ({ collections: mocks.collections }) },
  ),
}));

vi.mock('../../../store/alert/store', () => ({
  useAlertStore: (selector?: (state: unknown) => unknown) => {
    const state = { showAlert: mocks.showAlert };
    return selector ? selector(state) : state;
  },
}));

// jsdom lacks the layout APIs ProseMirror needs for typing (elementFromPoint,
// getClientRects), so the dialog tests swap the TipTap editor for a plain
// controlled textarea. The real editor is covered by DocsEditor.test.tsx.
vi.mock('../../../components/docs-editor/DocsEditor', () => ({
  DocsEditor: (props: { value: string; onChange: (markdown: string) => void }) => (
    <textarea value={props.value} onChange={event => props.onChange(event.target.value)} aria-label="Documentation editor" />
  ),
}));

const collections: Collection[] = [
  {
    id: 'c1',
    name: 'Payments API',
    description: '# Payments guide\n\nHow the collection fits together.',
    folders: [
      { id: 'f1', name: 'Auth', collectionId: 'c1' },
      { id: 'f2', name: 'Deep', parentId: 'f1', collectionId: 'c1' },
    ],
    requests: [
      { id: 'r3', name: 'Root health check', method: 'GET', order: 2, collectionId: 'c1' },
      { id: 'r2', name: 'Deep request', method: 'GET', order: 1, folderId: 'f2', collectionId: 'c1', documentation: '# Deep docs\n\nNested documentation.' },
      { id: 'r1', name: 'Auth request', method: 'POST', order: 1, folderId: 'f1', collectionId: 'c1', documentation: '' } as unknown as SavedRequest,
    ],
  },
];

describe('buildDocsSections', () => {
  it('orders sections collection > folder > request with heading levels', () => {
    const sections = buildDocsSections(buildDocsTree(collections));

    // Collections/folders are structural anchors; requests carry the content.
    expect(sections.map(section => section.node.id)).toEqual(['c1', 'f1', 'f2', 'r2', 'r1', 'r3']);
    expect(sections.map(section => section.level)).toEqual([1, 2, 3, 3, 3, 3]);
  });
});

describe('saveStagedDocs', () => {
  const sections = buildDocsSections(buildDocsTree(collections));

  it('writes only documents whose markdown changed', async () => {
    const actions = { updateCollection: vi.fn(), updateRequest: vi.fn() };
    const staged = new Map([
      ['c1', (sections[0].node.markdown ?? '') as string],
      ['r2', '# Deep docs\n\nRewritten documentation.'],
    ]);

    await expect(saveStagedDocs(sections, staged, actions)).resolves.toBe(true);

    expect(actions.updateCollection).not.toHaveBeenCalled();
    expect(actions.updateRequest).toHaveBeenCalledTimes(1);
    expect(actions.updateRequest).toHaveBeenCalledWith('c1', 'r2', { documentation: '# Deep docs\n\nRewritten documentation.' });
  });

  it('saves request docs into the documentation field', async () => {
    const actions = { updateRequest: vi.fn() };
    const staged = new Map([['r2', '# Deep docs v2']]);

    await expect(saveStagedDocs(sections, staged, actions)).resolves.toBe(true);

    expect(actions.updateRequest).toHaveBeenCalledTimes(1);
    expect(actions.updateRequest).toHaveBeenCalledWith('c1', 'r2', { documentation: '# Deep docs v2' });
  });

  it('aborts without writing further documents after a failed section', async () => {
    const actions = {
      updateCollection: vi.fn(),
      updateRequest: vi.fn().mockRejectedValueOnce(new Error('offline')),
    };
    const staged = new Map([
      ['r2', '# Deep docs v2'],
      ['r1', ''],
    ]);

    await expect(saveStagedDocs(sections, staged, actions)).resolves.toBe(false);
    expect(actions.updateRequest).toHaveBeenCalledTimes(1);
  });
});

describe('DocsTree', () => {
  it('expands collapsed ancestors so the active row is never hidden', () => {
    render(
      <DocsTree nodes={buildDocsTree(collections)} activeId="r2" onNavigate={() => {}} />
    );

    expect(screen.getByRole('button', { name: 'Deep request' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deep request' }).className).toContain('bg-blue-100');
  });

  it('collapses and expands a branch from its caret', () => {
    render(<DocsTree nodes={buildDocsTree(collections)} activeId="r1" onNavigate={() => {}} />);

    expect(screen.getByRole('button', { name: 'Toggle Auth' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Auth request' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Toggle Auth' }));
    expect(screen.queryByRole('button', { name: 'Auth request' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Toggle Auth' }));
    expect(screen.getByRole('button', { name: 'Auth request' })).toBeInTheDocument();
  });
});

describe('DocsDialog', () => {
  beforeAll(() => {
    mocks.collections.push(collections[0]);
  });

  beforeEach(() => {
    mocks.updateRequest.mockReset();
    mocks.updateCollection.mockReset();
    mocks.showAlert.mockReset();
  });

  it('labels request sections with their parent path for context', () => {
    render(<DocsDialog isOpen onClose={() => {}} initialNodeId="c1" />);

    expect(screen.getByText('Payments API / Auth / Deep')).toBeInTheDocument();
  });

  it('renders every request document as one continuous reading view', () => {
    render(<DocsDialog isOpen onClose={() => {}} initialNodeId="c1" />);

    // Structural headings group the reading view; only requests carry markdown.
    expect(screen.getByRole('heading', { name: 'Payments API' })).toBeInTheDocument();
    expect(screen.queryByText('How the collection fits together.')).not.toBeInTheDocument();
    expect(screen.getByText('Nested documentation.')).toBeInTheDocument();
    expect(screen.getAllByText('No documentation yet.').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('1 document')).toBeInTheDocument();
  });

  it('shows every document when opened to a node, highlighting the target section', async () => {
    render(<DocsDialog isOpen onClose={() => {}} initialNodeId="r3" />);

    expect(screen.getByText('Nested documentation.')).toBeInTheDocument();
    await vi.waitFor(() => {
      expect(screen.getByRole('button', { name: 'Root health check' }).className).toContain('bg-blue-100');
    });
  });

  it('opens to a collection by anchoring on its first nested request', async () => {
    render(<DocsDialog isOpen onClose={() => {}} initialNodeId="c1" />);

    await vi.waitFor(() => {
      expect(screen.getByRole('button', { name: 'Payments API' }).className).toContain('bg-blue-100');
    });
  });

  it('scrolls to a section when its tree row is clicked', () => {
    render(<DocsDialog isOpen onClose={() => {}} initialNodeId="c1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Root health check' }));

    const rootSection = document.querySelector('[data-section-id="r3"]');
    expect(rootSection).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Root health check' }).className).toContain('bg-blue-100');
  });

  it('syncs the tree with the section being read while scrolling', async () => {
    render(<DocsDialog isOpen onClose={() => {}} initialNodeId="c1" />);

    const scrollPane = screen.getByTestId('docs-scroll');
    fireEvent.click(screen.getByRole('button', { name: 'Toggle Auth' }));
    fireEvent.click(screen.getByRole('button', { name: 'Toggle Deep' }));

    // In jsdom every section sits at the top, so the spy selects the last one.
    fireEvent.scroll(scrollPane);

    await vi.waitFor(() => {
      expect(screen.getByRole('button', { name: 'Root health check' }).className).toContain('bg-blue-100');
    });
  });

  it('keeps Save disabled until a document actually changes, then saves and exits', async () => {
    render(<DocsDialog isOpen onClose={() => {}} initialNodeId="c1" />);

    fireEvent.click(screen.getByTitle('Edit documentation'));
    expect(screen.getAllByLabelText('Documentation editor').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('No changes yet')).toBeInTheDocument();
    const saveButton = screen.getByRole('button', { name: 'Save' });
    expect(saveButton).toBeDisabled();

    const editors = screen.getAllByLabelText('Documentation editor');
    fireEvent.change(editors[0], {
      target: { value: '# Deep docs\n\nRewritten documentation. CHANGED' },
    });

    await vi.waitFor(() => {
      expect(screen.getByText('1 unsaved change')).toBeInTheDocument();
      expect(saveButton).not.toBeDisabled();
    });

    fireEvent.click(saveButton);
    await vi.waitFor(() => {
      const documentationCalls = mocks.updateRequest.mock.calls.map(([, , updates]) => updates.documentation);
      expect(documentationCalls.some(markdown => markdown.includes('CHANGED'))).toBe(true);
      expect(mocks.showAlert).toHaveBeenCalledWith('Documentation saved', 'success');
    });
    expect(mocks.updateCollection).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument());
  });

  it('exits without touching the store when Cancel is clicked in edit mode', () => {
    render(<DocsDialog isOpen onClose={() => {}} initialNodeId="c1" />);

    fireEvent.click(screen.getByTitle('Edit documentation'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByText('Nested documentation.')).toBeInTheDocument();
    expect(mocks.updateCollection).not.toHaveBeenCalled();
    expect(mocks.updateRequest).not.toHaveBeenCalled();
  });

  it('closes directly when no edits are pending', async () => {
    const handleOnClose = vi.fn();
    render(<DocsDialog isOpen onClose={handleOnClose} initialNodeId="c1" />);

    fireEvent.click(screen.getByTitle('Edit documentation'));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByText('Discard unsaved changes?')).not.toBeInTheDocument();
    // Dialog closes through its exit animation before calling onClose.
    await vi.waitFor(() => expect(handleOnClose).toHaveBeenCalled());
  });

  it('guards closing with unsaved changes and discards on confirm', async () => {
    const handleOnClose = vi.fn();
    render(<DocsDialog isOpen onClose={handleOnClose} initialNodeId="c1" />);

    fireEvent.click(screen.getByTitle('Edit documentation'));
    const editors = screen.getAllByLabelText('Documentation editor');
    fireEvent.change(editors[0], {
      target: { value: '# Payments guide\n\nHow the collection fits together. CHANGED' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    // The close goes through Dialog's exit animation before the guard opens.
    await vi.waitFor(() => expect(screen.getByText('Discard unsaved changes?')).toBeInTheDocument());
    expect(handleOnClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(handleOnClose).toHaveBeenCalled();
    expect(mocks.updateCollection).not.toHaveBeenCalled();
  });

  it('does not offer Edit when there is nothing documented', () => {
    mocks.collections.length = 0;
    render(<DocsDialog isOpen onClose={() => {}} />);

    expect(screen.getByText('No documentation yet')).toBeInTheDocument();
    expect(screen.queryByTitle('Edit documentation')).not.toBeInTheDocument();
    // Restore shared fixture state for any later tests.
    mocks.collections.push(collections[0]);
  });
});
