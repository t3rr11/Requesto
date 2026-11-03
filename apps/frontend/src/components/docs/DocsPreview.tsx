import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { createDocsExtensions } from '../docs-editor/Extensions';

interface DocsPreviewProps {
  markdown: string;
}

/**
 * Read-only markdown renderer reusing the docs editor extensions and styles so
 * previewed documentation looks identical to the editor on the request Docs tab.
 */
export function DocsPreview({ markdown }: Readonly<DocsPreviewProps>) {
  const editor = useEditor({
    content: markdown,
    contentType: 'markdown',
    extensions: createDocsExtensions(),
    editable: false,
  });

  // Mirror DocsEditor: re-apply external content changes after a store refresh.
  useEffect(() => {
    if (!editor) return;
    if (markdown === editor.getMarkdown()) return;
    editor.commands.setContent(markdown, { contentType: 'markdown', emitUpdate: false });
    editor.setOptions({ editable: false });
  }, [markdown, editor]);

  if (!editor) return null;

  if (!markdown.trim()) {
    return <p className="text-sm italic text-gray-400 dark:text-gray-500">No documentation yet.</p>;
  }

  return <EditorContent editor={editor} className="requesto-doc requesto-doc--preview" />;
}
