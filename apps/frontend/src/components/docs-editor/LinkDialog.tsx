import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { Button } from '../Button';
import { Dialog } from '../Dialog';
import { findLinkAtSelection, upsertLink } from './LinkHelpers';

interface LinkDialogProps {
  editor: Editor;
  isOpen: boolean;
  onClose: () => void;
  readOnly: boolean;
}
export function LinkDialog({ editor, isOpen, onClose, readOnly }: Readonly<LinkDialogProps>) {
  const [href, setHref] = useState('');
  const [linkText, setLinkText] = useState('');
  const [hasExistingLink, setHasExistingLink] = useState(false);

  const [prevIsOpen, setPrevIsOpen] = useState(false);
  const [urlRef, setUrlRef] = useState<HTMLInputElement | null>(null);
  useEffect(() => {
    if (isOpen && !prevIsOpen) {
      const info = findLinkAtSelection(editor);
      const { from, to } = editor.state.selection;
      setHref(info?.href ?? '');
      setLinkText(info?.text ?? editor.state.doc.textBetween(from, to, ' ', ' '));
      setHasExistingLink(!!info);
      urlRef?.focus();
    }
    setPrevIsOpen(isOpen);
  }, [isOpen, prevIsOpen, editor, urlRef]);

  const applyLink = () => {
    const url = href.trim();
    if (!url) return;
    upsertLink(editor, url, linkText);
    onClose();
  };

  const removeLink = () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    onClose();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') applyLink();
    if (event.key === 'Escape') onClose();
  };

  return (
    <Dialog isOpen={isOpen && !readOnly} onClose={onClose} title="Link" size="sm">
      <div className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="Text"
          value={linkText}
          onChange={event => setLinkText(event.target.value)}
          onKeyDown={onKeyDown}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          aria-label="Link text"
        />
        <input
          type="text"
          ref={setUrlRef}
          placeholder="https://example.com"
          value={href}
          onChange={event => setHref(event.target.value)}
          onKeyDown={onKeyDown}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          aria-label="Link URL"
        />
        <div className="flex items-center justify-between gap-2">
          {hasExistingLink && (
            <Button variant="danger" size="sm" onClick={removeLink}>
              Remove link
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={applyLink} disabled={!href.trim()}>
              Apply
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
