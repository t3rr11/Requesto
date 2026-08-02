import { useEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { GraphQLObjectType, GraphQLSchema, GraphQLString } from 'graphql';
import { GraphQLQueryEditor } from '../../components/GraphQLQueryEditor';

const mocks = vi.hoisted(() => {
  const model = {
    uri: { toString: () => 'requesto://graphql/tab-1.graphql' },
    getValue: () => 'query { greeting }',
    getWordUntilPosition: () => ({ startColumn: 1, endColumn: 1 }),
    onDidChangeContent: vi.fn(() => ({ dispose: vi.fn() })),
  };
  const editor = { getModel: () => model };
  const completionDispose = vi.fn();
  const registerCompletionItemProvider = vi.fn(() => ({ dispose: completionDispose }));
  const monaco = {
    editor: { setModelMarkers: vi.fn() },
    languages: {
      registerCompletionItemProvider,
      CompletionItemKind: { Field: 5 },
      CompletionItemInsertTextRule: { InsertAsSnippet: 4 },
      CompletionItemTag: { Deprecated: 1 },
    },
    MarkerSeverity: { Error: 8, Warning: 4, Info: 2 },
  };
  return { editor, monaco, registerCompletionItemProvider, completionDispose };
});

vi.mock('graphql-language-service', () => ({
  getAutocompleteSuggestions: vi.fn(() => []),
  getDiagnostics: vi.fn(() => []),
  Position: class Position {
    constructor(public line: number, public character: number) {}
  },
}));

vi.mock('@monaco-editor/react', () => ({
  default: ({ onMount }: { onMount: (editor: unknown, monaco: unknown) => void }) => {
    useEffect(() => {
      const timer = setTimeout(() => onMount(mocks.editor, mocks.monaco), 0);
      return () => clearTimeout(timer);
    }, [onMount]);
    return <div data-testid="graphql-editor" />;
  },
}));

function createSchema() {
  return new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'Query',
      fields: { greeting: { type: GraphQLString } },
    }),
  });
}

describe('GraphQLQueryEditor', () => {
  it('reinstalls IntelliSense when remounted with the same schema and model id', async () => {
    mocks.registerCompletionItemProvider.mockClear();
    mocks.completionDispose.mockClear();
    const props = {
      value: 'query { greeting }',
      onChange: vi.fn(),
      schema: createSchema(),
      modelId: 'tab-1',
      isDarkMode: false,
      readOnly: false,
      beforeMount: vi.fn(),
    };

    const first = render(<GraphQLQueryEditor {...props} />);
    await waitFor(() => expect(mocks.registerCompletionItemProvider).toHaveBeenCalledTimes(1));
    first.unmount();

    render(<GraphQLQueryEditor {...props} />);
    await waitFor(() => expect(mocks.registerCompletionItemProvider).toHaveBeenCalledTimes(2));
  });
});
