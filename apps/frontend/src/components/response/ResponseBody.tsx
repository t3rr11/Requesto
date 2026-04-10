import Editor, { Monaco } from '@monaco-editor/react';
import { formatResponseBody } from '../../helpers/responseHelpers';
import { useTabsStore } from '../../store/tabs';
import { ResponseBodyStreaming } from './ResponseBodyStreaming';
import { useThemeStore } from '../../store/theme';

export function ResponseBody() {
  const { getActiveTab } = useTabsStore();
  const { isDarkMode } = useThemeStore();
  const activeTab = getActiveTab();
  const response = activeTab?.response || null;

  // Check if this is a streaming response
  const isStreaming = response && 'isStreaming' in response && response.isStreaming;

  if (isStreaming) {
    return (
      <div className="h-full">
        <ResponseBodyStreaming
          events={response.events || []}
          status={response.status}
          statusText={response.statusText}
        />
      </div>
    );
  }

  return (
    <div className="h-full p-6">
      <div className="border border-gray-300 dark:border-gray-700 rounded overflow-hidden h-full">
        <Editor
          height="100%"
          defaultLanguage="json"
          value={formatResponseBody((response && 'body' in response ? response.body : '') || '')}
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
            readOnly: true,
            wordWrap: 'on',
          }}
        />
      </div>
    </div>
  );
}
