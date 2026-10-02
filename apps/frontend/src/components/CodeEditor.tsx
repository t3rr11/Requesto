import Editor, { type Monaco } from '@monaco-editor/react';
import { useThemeStore } from '../store/theme/store';

interface CodeEditorProps {
  /** Monaco language id, e.g. 'json' | 'xml' | 'html' | 'plaintext' | 'javascript'. */
  language: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}

/**
 * Shared Monaco wrapper providing the app-wide editor chrome (borders, theme,
 * layout handling) so pages don't each re-declare the same inline options.
 */
export function CodeEditor({ language, value, onChange, readOnly = false }: Readonly<CodeEditorProps>) {
  const isDarkMode = useThemeStore((s) => s.isDarkMode);

  return (
    <div className="border border-gray-300 dark:border-gray-700 rounded overflow-hidden h-full">
      <Editor
        height="100%"
        language={language}
        value={value}
        onChange={(next) => onChange?.(next ?? '')}
        theme={isDarkMode ? 'custom-dark' : 'vs-light'}
        beforeMount={(monaco: Monaco) => {
          monaco.editor.defineTheme('custom-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [],
            colors: {
              'editor.background': '#1f2937',
              'editor.lineHighlightBackground': '#374151',
              'editorLineNumber.foreground': '#6b7280',
              'editorLineNumber.activeForeground': '#9ca3af',
            },
          });
        }}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          readOnly,
          wordWrap: 'on',
          unicodeHighlight: {
            ambiguousCharacters: false,
            invisibleCharacters: false,
            nonBasicASCII: false,
          },
        }}
      />
    </div>
  );
}
