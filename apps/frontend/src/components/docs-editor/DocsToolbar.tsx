import type { Editor } from '@tiptap/react';
import { Button } from '../Button';
import { Tooltip } from '../Tooltip';
import {
  Bold,
  Code,
  CodeXml,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Pencil,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
} from 'lucide-react';

interface ToolbarButton {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  action: () => void;
}

/**
 * Derives all toolbar/dialog state from the editor document & selection so
 * React re-renders (useEditorState) as marks/selection change.
 */
export interface DocsEditorState {
  canUndo: boolean;
  canRedo: boolean;
  isH1: boolean;
  isH2: boolean;
  isH3: boolean;
  isBold: boolean;
  isItalic: boolean;
  isStrike: boolean;
  isCode: boolean;
  isCodeBlock: boolean;
  isBulletList: boolean;
  isOrderedList: boolean;
  isBlockquote: boolean;
  hasLink: boolean;
}

export function selectDocsEditorState(editor: Editor | null): DocsEditorState {
  if (!editor) {
    return {
      canUndo: false,
      canRedo: false,
      isH1: false,
      isH2: false,
      isH3: false,
      isBold: false,
      isItalic: false,
      isStrike: false,
      isCode: false,
      isCodeBlock: false,
      isBulletList: false,
      isOrderedList: false,
      isBlockquote: false,
      hasLink: false,
    };
  }
  const can = editor.can();
  return {
    canUndo: can.undo(),
    canRedo: can.redo(),
    isH1: editor.isActive('heading', { level: 1 }),
    isH2: editor.isActive('heading', { level: 2 }),
    isH3: editor.isActive('heading', { level: 3 }),
    isBold: editor.isActive('bold'),
    isItalic: editor.isActive('italic'),
    isStrike: editor.isActive('strike'),
    isCode: editor.isActive('code'),
    isCodeBlock: editor.isActive('codeBlock'),
    isBulletList: editor.isActive('bulletList'),
    isOrderedList: editor.isActive('orderedList'),
    isBlockquote: editor.isActive('blockquote'),
    hasLink: !!editor.getAttributes('link').href,
  };
}

interface DocsToolbarProps {
  editor: Editor;
  readOnly: boolean;
  state: DocsEditorState;
  onOpenLinkDialog: () => void;
}
export function DocsToolbar({ editor, readOnly, state, onOpenLinkDialog }: Readonly<DocsToolbarProps>) {
  const chain = () => editor.chain().focus();
  const buttons: ToolbarButton[][] = [
    [
      { icon: <Undo2 className="h-4 w-4" />, label: 'Undo', disabled: !state.canUndo, action: () => chain().undo().run() },
      { icon: <Redo2 className="h-4 w-4" />, label: 'Redo', disabled: !state.canRedo, action: () => chain().redo().run() },
    ],
    [
      { icon: <Heading1 className="h-4 w-4" />, label: 'Heading 1', active: state.isH1, action: () => chain().toggleHeading({ level: 1 }).run() },
      { icon: <Heading2 className="h-4 w-4" />, label: 'Heading 2', active: state.isH2, action: () => chain().toggleHeading({ level: 2 }).run() },
      { icon: <Heading3 className="h-4 w-4" />, label: 'Heading 3', active: state.isH3, action: () => chain().toggleHeading({ level: 3 }).run() },
    ],
    [
      { icon: <Bold className="h-4 w-4" />, label: 'Bold', active: state.isBold, action: () => chain().toggleBold().run() },
      { icon: <Italic className="h-4 w-4" />, label: 'Italic', active: state.isItalic, action: () => chain().toggleItalic().run() },
      { icon: <Strikethrough className="h-4 w-4" />, label: 'Strikethrough', active: state.isStrike, action: () => chain().toggleStrike().run() },
      { icon: <Code className="h-4 w-4" />, label: 'Inline code', active: state.isCode, action: () => chain().toggleCode().run() },
    ],
    [
      { icon: <CodeXml className="h-4 w-4" />, label: 'Code block', active: state.isCodeBlock, action: () => chain().toggleCodeBlock().run() },
      { icon: <List className="h-4 w-4" />, label: 'Bullet list', active: state.isBulletList, action: () => chain().toggleBulletList().run() },
      { icon: <ListOrdered className="h-4 w-4" />, label: 'Numbered list', active: state.isOrderedList, action: () => chain().toggleOrderedList().run() },
      { icon: <Quote className="h-4 w-4" />, label: 'Quote', active: state.isBlockquote, action: () => chain().toggleBlockquote().run() },
      { icon: <Minus className="h-4 w-4" />, label: 'Horizontal rule', action: () => chain().setHorizontalRule().run() },
    ],
    state.hasLink
      ? [{ icon: <Pencil className="h-4 w-4" />, label: 'Edit link', active: true, action: onOpenLinkDialog }]
      : [{ icon: <Link2 className="h-4 w-4" />, label: 'Add link', action: onOpenLinkDialog }],
  ];

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 py-1 shrink-0">
      {buttons.map((group, groupIndex) => (
        <div
          key={groupIndex}
          className={`flex items-center gap-0.5 ${groupIndex > 0 ? 'pl-1.5 border-l border-gray-200 dark:border-gray-700' : ''}`}
        >
          {group.map(button => (
            <Tooltip key={button.label} content={button.label}>
              <Button
                variant="icon"
                size="sm"
                disabled={readOnly || button.disabled}
                aria-label={button.label}
                onClick={button.action}
                className={button.active ? 'text-blue-600 dark:text-blue-400 bg-gray-200/70 dark:bg-gray-700 rounded' : ''}
              >
                {button.icon}
              </Button>
            </Tooltip>
          ))}
        </div>
      ))}
    </div>
  );
}
