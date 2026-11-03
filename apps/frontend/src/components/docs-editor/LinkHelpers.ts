import { getMarkRange, getMarksBetween, type Editor } from '@tiptap/core';

export interface LinkRange {
  href: string;
  text: string;
  from: number;
  to: number;
}

/**
 * Finds the link at the current selection and resolves it to its full extent,
 * so editing always operates on the whole link rather than a partial selection.
 */
export function findLinkAtSelection(editor: Editor): LinkRange | null {
  const href = editor.getAttributes('link').href;
  if (typeof href !== 'string' || href === '') return null;

  const { state } = editor;
  const linkType = state.schema.marks.link;
  const { from, to, $head, empty } = state.selection;

  const span = empty
    ? getMarkRange($head, linkType)
    : getMarksBetween(from, to, state.doc)
        .find(mark => mark.mark.type === linkType);
  if (!span) return null;

  return {
    href,
    text: state.doc.textBetween(span.from, span.to, ' ', ' '),
    from: span.from,
    to: span.to,
  };
}

export function upsertLink(editor: Editor, url: string, text: string): void {
  const existing = findLinkAtSelection(editor);
  const { empty, from, to } = editor.state.selection;
  const selectedText = empty ? '' : editor.state.doc.textBetween(from, to, ' ', ' ');
  const nextText = (text.trim() || (existing ? existing.text : selectedText) || url).trim();

  if (existing) {
    if (nextText === existing.text) {
      // Only the URL changed: keep the link text and any other marks on it.
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    } else {
      // Replace the entire link text, not just the highlighted part.
      editor
        .chain()
        .focus()
        .insertContentAt(
          { from: existing.from, to: existing.to },
          { type: 'text', text: nextText, marks: [{ type: 'link', attrs: { href: url } }] },
        )
        .run();
    }
    return;
  }

  if (empty) {
    editor.chain().focus().insertContent({ type: 'text', text: nextText, marks: [{ type: 'link', attrs: { href: url } }] }).run();
  } else if (nextText === selectedText) {
    editor.chain().focus().setLink({ href: url }).run();
  } else {
    editor.chain().focus().insertContentAt({ from, to }, { type: 'text', text: nextText, marks: [{ type: 'link', attrs: { href: url } }] }).run();
  }
}
