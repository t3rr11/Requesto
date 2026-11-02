import { describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import { render, screen } from '@testing-library/react';
import { DocsEditor } from '../../../components/docs-editor/DocsEditor';
import { createDocsExtensions } from '../../../components/docs-editor/Extensions';
import { findLinkAtSelection, upsertLink } from '../../../components/docs-editor/LinkHelpers';

function createEditor(markdown: string): Editor {
  return new Editor({
    content: markdown,
    contentType: 'markdown',
    extensions: createDocsExtensions(),
  });
}

const sampleMarkdown = [
  '# Health Check',
  '',
  'Verifies the backend is up before tests run. Uses **{{baseUrl}}** and `expect`.',
  '',
  '- Pinged on every run',
  '- Optional for local dev',
  '',
  '```js',
  "test('status is 200', () => {",
  '  expect(response.status).toBe(200);',
  '});',
  '```',
  '',
  '> Tip: pair this with the collection runner.',
].join('\n');

describe('DocsEditor markdown contract', () => {
  it('parses markdown into a rich document structure', () => {
    const editor = createEditor(sampleMarkdown);
    const json = editor.getJSON();

    const headings = json.content?.filter(node => node.type === 'heading');
    const lists = json.content?.filter(node => node.type === 'bulletList');
    const codeBlocks = json.content?.filter(node => node.type === 'codeBlock');
    const blockquotes = json.content?.filter(node => node.type === 'blockquote');

    expect(headings?.length).toBeGreaterThanOrEqual(1);
    expect(lists?.length).toBe(1);
    expect(codeBlocks?.length).toBe(1);
    expect(blockquotes?.length).toBe(1);
    expect(JSON.stringify(json)).toContain('bold');
    expect(JSON.stringify(json)).toContain('code');
    editor.destroy();
  });

  it('serializes back to stable plain markdown (no HTML)', () => {
    const editor = createEditor(sampleMarkdown);
    const serialized = editor.getMarkdown();

    expect(serialized).not.toContain('<');
    // Round-tripping the serialized output must be lossless.
    const secondPass = createEditor(serialized).getMarkdown();
    expect(secondPass).toBe(serialized);
    editor.destroy();
  });

  it('round-trips links without inline HTML', () => {
    const editor = createEditor('See the [tests guide](https://requesto.com.au) for details.');
    const serialized = editor.getMarkdown();

    expect(serialized).toBe('See the [tests guide](https://requesto.com.au) for details.');
    editor.destroy();
  });

  it('keeps code blocks as fenced blocks', () => {
    const codeBlockMarkdown = ['Before', '', '```js', 'const x = 1;', '```', '', 'After'].join('\n');
    const editor = createEditor(codeBlockMarkdown);
    const serialized = editor.getMarkdown();

    expect(serialized).toContain('```js');
    expect(serialized).toContain('const x = 1;');
    editor.destroy();
  });
});

describe('DocsEditor toolbar', () => {
  it('shows the add-link action when the selection is not in a link', () => {
    render(<DocsEditor value="Plain text, no links here." />);

    expect(screen.getByLabelText('Add link')).toBeInTheDocument();
    expect(screen.queryByLabelText('Remove link')).not.toBeInTheDocument();
  });
});

describe('DocsEditor link helpers', () => {
  // Markdown docs are single-paragraph documents, so the text of a markdown
  // document starts at ProseMirror position 1, not 0.
  const docText = 'Read the tests guide today.';
  const linkStart = docText.indexOf('tests') + 1;
  const linkEnd = linkStart + 'tests guide'.length;

  it('finds the whole link range at the cursor, not just the selection', () => {
    const editor = createEditor('Read the [tests guide](https://a.example) today.');
    editor.commands.setTextSelection(docText.indexOf('guide') + 1);

    const info = findLinkAtSelection(editor);
    expect(info?.href).toBe('https://a.example');
    expect(info?.text).toBe('tests guide');
    expect(editor.state.doc.textBetween(info!.from, info!.to)).toBe('tests guide');
    editor.destroy();
  });

  it('keeps the link text when only the URL changes', () => {
    const editor = createEditor('Read the [**tests guide**](https://a.example) today.');
    editor.commands.setTextSelection(docText.indexOf('guide') + 1);

    upsertLink(editor, 'https://b.example', 'tests guide');
    expect(editor.getMarkdown()).toBe('Read the [**tests guide**](https://b.example) today.');
    editor.destroy();
  });

  it('replaces the whole link text when the text changes', () => {
    const editor = createEditor('Read the [tests guide](https://a.example) today.');
    editor.commands.setTextSelection(docText.indexOf('guide') + 1);

    upsertLink(editor, 'https://b.example', 'docs');
    expect(editor.getMarkdown()).toBe('Read the [docs](https://b.example) today.');
    editor.destroy();
  });

  it('marks selected text as a link without changing it', () => {
    const editor = createEditor('Read the tests guide today.');
    editor.commands.setTextSelection({ from: linkStart, to: linkEnd });

    upsertLink(editor, 'https://b.example', '');
    expect(editor.getMarkdown()).toBe('Read the [tests guide](https://b.example) today.');
    editor.destroy();
  });

  it('inserts a new link with the given text when nothing is selected', () => {
    // The doc has two spaces here; the cursor sits between them so the
    // inserted link text ends up surrounded by a space on each side.
    const editor = createEditor('See today  more text.');
    editor.commands.setTextSelection('See today  more text.'.indexOf('  ') + 2);

    upsertLink(editor, 'https://b.example', 'docs');
    expect(editor.getMarkdown()).toBe('See today [docs](https://b.example) more text.');
    editor.destroy();
  });
});
