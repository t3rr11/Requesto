import { useEffect, useRef } from 'react';
import Editor, { type BeforeMount, type Monaco, type OnMount } from '@monaco-editor/react';
import { getAutocompleteSuggestions, getDiagnostics, Position } from 'graphql-language-service';
import type { GraphQLSchema } from 'graphql';

interface GraphQLQueryEditorProps {
  value: string;
  onChange: (value: string) => void;
  schema: GraphQLSchema | null;
  modelId: string;
  isDarkMode: boolean;
  readOnly: boolean;
  beforeMount: BeforeMount;
}

type EditorInstance = Parameters<OnMount>[0];
type EditorModel = NonNullable<ReturnType<EditorInstance['getModel']>>;
type EditorPosition = Parameters<EditorModel['getWordUntilPosition']>[0];
type Disposable = { dispose: () => void };

export function GraphQLQueryEditor({
  value,
  onChange,
  schema,
  modelId,
  isDarkMode,
  readOnly,
  beforeMount,
}: Readonly<GraphQLQueryEditorProps>) {
  const monacoRef = useRef<Monaco | null>(null);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const languageFeaturesRef = useRef<Disposable | null>(null);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    languageFeaturesRef.current?.dispose();
    languageFeaturesRef.current = installGraphQLLanguageFeatures(editor, monaco, schema);
  };

  useEffect(() => {
    const monaco = monacoRef.current;
    const editor = editorRef.current;
    if (monaco && editor) {
      languageFeaturesRef.current?.dispose();
      languageFeaturesRef.current = installGraphQLLanguageFeatures(editor, monaco, schema);
    }

    return () => {
      languageFeaturesRef.current?.dispose();
      languageFeaturesRef.current = null;
    };
  }, [schema, modelId]);

  return (
    <Editor
      height="100%"
      path={`requesto://graphql/${modelId}.graphql`}
      defaultLanguage="graphql"
      value={value}
      onChange={nextValue => onChange(nextValue ?? '')}
      onMount={handleMount}
      theme={isDarkMode ? 'custom-dark' : 'vs-light'}
      beforeMount={beforeMount}
      options={{
        minimap: { enabled: false },
        fontSize: 13,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        formatOnPaste: true,
        quickSuggestions: true,
        suggestOnTriggerCharacters: true,
        readOnly,
      }}
    />
  );
}

function installGraphQLLanguageFeatures(
  editor: EditorInstance,
  monaco: Monaco,
  schema: GraphQLSchema | null,
): Disposable | null {
  const model = editor.getModel();
  if (!model || !schema) return null;

  const updateDiagnostics = () => {
    const markers = getDiagnostics(model.getValue(), schema).map(diagnostic => ({
      severity: toMarkerSeverity(monaco, diagnostic.severity),
      message: diagnostic.message as string,
      startLineNumber: diagnostic.range.start.line + 1,
      startColumn: diagnostic.range.start.character + 1,
      endLineNumber: diagnostic.range.end.line + 1,
      endColumn: Math.max(diagnostic.range.end.character + 1, diagnostic.range.start.character + 2),
    }));

    monaco.editor.setModelMarkers(model, 'requesto-graphql', markers);
  };

  const completionProvider = monaco.languages.registerCompletionItemProvider('graphql', {
    triggerCharacters: ['{', '(', ':', '$', '@'],
    provideCompletionItems: (activeModel: EditorModel, position: EditorPosition) => {
      if (activeModel.uri.toString() !== model.uri.toString()) return { suggestions: [] };
      const word = activeModel.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };
      const suggestions = getAutocompleteSuggestions(
        schema,
        activeModel.getValue(),
        new Position(position.lineNumber - 1, position.column - 1),
        undefined,
        undefined,
        { fillLeafsOnComplete: true, uri: activeModel.uri.toString() },
      ).map(suggestion => ({
        label: suggestion.label,
        kind: monaco.languages.CompletionItemKind.Field,
        detail: suggestion.detail,
        documentation: suggestion.documentation ?? undefined,
        insertText: suggestion.insertText ?? suggestion.rawInsert ?? suggestion.label,
        insertTextRules: suggestion.insertTextFormat
          ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
          : undefined,
        sortText: suggestion.sortText,
        tags: suggestion.isDeprecated ? [monaco.languages.CompletionItemTag.Deprecated] : undefined,
        range,
      }));
      return { suggestions };
    },
  });
  const changeSubscription = model.onDidChangeContent(updateDiagnostics);
  updateDiagnostics();

  return {
    dispose: () => {
      completionProvider.dispose();
      changeSubscription.dispose();
      monaco.editor.setModelMarkers(model, 'requesto-graphql', []);
    },
  };
}

function toMarkerSeverity(monaco: Monaco, severity: number | undefined) {
  switch (severity) {
    case 2:
      return monaco.MarkerSeverity.Warning;
    case 3:
    case 4:
      return monaco.MarkerSeverity.Info;
    default:
      return monaco.MarkerSeverity.Error;
  }
}
