import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Pencil } from 'lucide-react';
import { Dialog } from '../Dialog';
import { Button } from '../Button';
import { ConfirmDialog } from '../ConfirmDialog';
import { useCollectionsStore } from '../../store/collections/store';
import { useAlertStore } from '../../store/alert/store';
import { useDocsScrollSpy } from '../../hooks/useDocsScrollSpy';
import { DocsTree } from './DocsTree';
import { DocsSection } from './DocsSection';
import { buildDocsSections, buildDocsTree, type DocsTreeNode } from './DocsTreeHelpers';
import { saveStagedDocs } from './SaveDocs';

interface DocsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialNodeId?: string | null;
}

export function DocsDialog({ isOpen, onClose, initialNodeId }: Readonly<DocsDialogProps>) {
  const collections = useCollectionsStore(state => state.collections);
  const updateRequest = useCollectionsStore(state => state.updateRequest);
  const showAlert = useAlertStore(state => state.showAlert);

  const [editing, setEditing] = useState(false);
  const [staged, setStaged] = useState<Map<string, string>>(new Map());
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const tree = useMemo(() => buildDocsTree(collections), [collections]);
  const sections = useMemo(() => buildDocsSections(tree), [tree]);

  const { contentRef, activeId, setActiveId, registerSection, handleNavigate, scrollToSection, handleScroll } =
    useDocsScrollSpy(sections);

  const handleStageMarkdown = (nodeId: string, markdown: string) => {
    setStaged(previous => {
      if (previous.get(nodeId) === markdown) return previous;
      const next = new Map(previous);
      next.set(nodeId, markdown);
      return next;
    });
  };

  const documentsCount = useMemo(
    () => sections.filter(section => section.node.kind === 'request' && section.node.markdown.trim()).length,
    [sections],
  );

  const changedCount = useMemo(
    () =>
      [...staged].filter(([nodeId, markdown]) => {
        const section = sections.find(candidate => candidate.node.id === nodeId);
        return section !== undefined && section.node.markdown !== markdown;
      }).length,
    [staged, sections],
  );

  // Deferred navigation on open: the reading content mounts one commit after the
  // dialog becomes visible, so hopping via state guarantees the section refs
  // exist by the time we scroll (an rAF could fire before that mount).
  const [pendingAnchor, setPendingAnchor] = useState<string | null>(null);
  useEffect(() => {
    if (!pendingAnchor) return;
    if (!scrollToSection(pendingAnchor)) return;
    setPendingAnchor(null);
  }, [pendingAnchor, scrollToSection]);

  // Reset the reading position & staging whenever the dialog (re)opens.
  const [prevIsOpen, setPrevIsOpen] = useState(false);
  useEffect(() => {
    if (isOpen && !prevIsOpen) {
      const findNodeById = (nodes: DocsTreeNode[], id: string): DocsTreeNode | null => {
        for (const node of nodes) {
          if (node.id === id) return node;
          const nested = findNodeById(node.children, id);
          if (nested) return nested;
        }
        return null;
      };
      const target = (initialNodeId ? findNodeById(tree, initialNodeId) : null) ?? sections[0]?.node;
      setActiveId(target?.id ?? null);
      setEditing(false);
      setStaged(new Map());
      setPendingAnchor(target?.id ?? null);
    }
    setPrevIsOpen(isOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, prevIsOpen]);

  const handleStartEditing = () => {
    setStaged(
      new Map(
        sections
          .filter(section => section.node.kind === 'request' && section.node.markdown.trim())
          .map(section => [section.node.id, section.node.markdown]),
      ),
    );
    setEditing(true);
  };

  const handleCancelEditing = () => {
    setStaged(new Map());
    setEditing(false);
  };

  const handleSaveEditing = async () => {
    const saved = await saveStagedDocs(sections, staged, { updateRequest });
    if (!saved) {
      showAlert('Failed to save documentation', 'error');
      return;
    }
    if (changedCount > 0) showAlert('Documentation saved', 'success');
    setStaged(new Map());
    setEditing(false);
  };

  const handleRequestClose = () => {
    if (editing && changedCount > 0) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      onCloseRequest={handleRequestClose}
      title={initialNodeId ? `Documentation — ${collections.find(collection => collection.id === initialNodeId)?.name ?? ''}` : 'Documentation'}
      size="full"
      fullBleed
    >
      <div className="flex flex-col h-full min-h-0">
        <div className="flex items-center justify-between gap-3 shrink-0 px-4 py-2.5 border-b border-gray-200 dark:border-gray-700/60">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
            <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {!editing ? (
                documentsCount === 0 ? 'No documentation yet' : `${documentsCount} document${documentsCount === 1 ? '' : 's'}`
              ) : changedCount === 0 ? (
                'No changes yet'
              ) : (
                `${changedCount} unsaved change${changedCount === 1 ? '' : 's'}`
              )}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {editing ? (
              <>
                <Button variant="secondary" size="sm" onClick={handleCancelEditing}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" disabled={changedCount === 0} onClick={() => void handleSaveEditing()}>
                  Save
                </Button>
              </>
            ) : (
              documentsCount > 0 && (
                <Button onClick={handleStartEditing} variant="icon" size="sm" title="Edit documentation">
                  <Pencil className="w-4 h-4" />
                </Button>
              )
            )}
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          <div className="w-64 shrink-0 overflow-y-auto border-r border-gray-200 dark:border-gray-700 p-2">
            <DocsTree nodes={tree} activeId={activeId ?? undefined} onNavigate={handleNavigate} />
          </div>
          <div ref={contentRef} onScroll={handleScroll} data-testid="docs-scroll" className="flex-1 min-h-0 overflow-y-auto">
            <div className="px-10 pt-4 pb-24">
              {sections.map((section, index) => (
                <DocsSection
                  key={section.node.id}
                  section={section}
                  prevKind={index > 0 ? sections[index - 1].node.kind : undefined}
                  isEditing={editing}
                  staged={staged}
                  onStage={handleStageMarkdown}
                  registerSection={registerSection}
                />
              ))}
              {sections.length === 0 && (
                <p className="py-16 text-center text-sm text-gray-400 dark:text-gray-500 italic">
                  Nothing to document yet — add a request first.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        title="Discard unsaved changes?"
        message="You have unsaved documentation edits. Closing now will discard them."
        confirmText="Discard"
        variant="danger"
        onConfirm={() => {
          setStaged(new Map());
          setEditing(false);
          onClose();
        }}
      />
    </Dialog>
  );
}
