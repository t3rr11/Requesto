import { useEffect, useState } from 'react';
import { useEditor, useEditorState, EditorContent } from '@tiptap/react';
import { createDocsExtensions } from './Extensions';
import { DocsToolbar, selectDocsEditorState, type DocsEditorState } from './DocsToolbar';
import { LinkDialog } from './LinkDialog';

interface DocsEditorProps {
  value: string;
  onChange?: (markdown: string) => void;
  readOnly?: boolean;
}

/**
 * Rich text documentation editor backed by TipTap, persisted as markdown
 * so request docs stay readable and diffable in git.
 */
export function DocsEditor({ value, onChange, readOnly = false }: Readonly<DocsEditorProps>) {
  const editor = useEditor({
    content: value,
    contentType: 'markdown',
    extensions: createDocsExtensions(),
    onUpdate: ({ editor }) => onChange?.(editor.getMarkdown()),
    editable: !readOnly,
  });

  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  // Re-apply external form resets (tab switches) without echoing back into
  // the form. setContent does not emit an update, so no re-render loop.
  useEffect(() => {
    if (!editor) return;
    if (value === editor.getMarkdown()) return;
    editor.commands.setContent(value, { contentType: 'markdown', emitUpdate: false });
  }, [value, editor]);

  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [editor, readOnly]);

  const state = useEditorState<DocsEditorState>({
    editor,
    selector: context => selectDocsEditorState(context.editor),
  });

  if (!editor || !state) return null;

  return (
    <div className="h-full flex flex-col min-h-0">
      <DocsToolbar editor={editor} readOnly={readOnly} state={state} onOpenLinkDialog={() => setLinkDialogOpen(true)} />
      {/* basis-auto, not flex-1: always fills/resizes per host, so the caret stays reachable */}
      <div className="grow basis-auto overflow-y-auto">
        <EditorContent editor={editor} className="requesto-doc requesto-doc--editor" />
      </div>
      <LinkDialog
        editor={editor}
        isOpen={linkDialogOpen}
        onClose={() => setLinkDialogOpen(false)}
        readOnly={readOnly}
      />
    </div>
  );
}
