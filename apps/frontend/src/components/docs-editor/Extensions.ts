import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import Placeholder from '@tiptap/extension-placeholder';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import type { Extensions } from '@tiptap/core';

const lowlight = createLowlight(common);

export function createDocsExtensions(): Extensions {
  return [
    StarterKit.configure({
      link: { openOnClick: false },
      codeBlock: false,
    }),
    CodeBlockLowlight.configure({ lowlight, defaultLanguage: 'plaintext' }),
    Markdown.configure({ indentation: { style: 'space', size: 2 } }),
    Placeholder.configure({ placeholder: 'Documentation lives here. Type markdown or use the toolbar...' }),
  ];
}
