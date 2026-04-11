import Editor, { type Monaco } from '@monaco-editor/react';
import type { ProxyResponse, StreamingResponse } from '../../store/request/types';
import { formatResponseBody } from '../../helpers/response';
import { ResponseBodyStreaming } from './ResponseBodyStreaming';

interface ResponseBodyProps {
  response: ProxyResponse | StreamingResponse;
  isDarkMode: boolean;
}

export function ResponseBody({ response, isDarkMode }: ResponseBodyProps) {
  const isStreaming = 'isStreaming' in response && response.isStreaming;

  if (isStreaming) {
    const streamingResponse = response as StreamingResponse;
    return (
      <div className="h-full">
        <ResponseBodyStreaming
          events={streamingResponse.events || []}
          status={streamingResponse.status}
          statusText={streamingResponse.statusText}
        />
      </div>
    );
  }

  const body = 'body' in response ? response.body : '';

  return (
    <div className="h-full p-6">
      <div className="border border-gray-300 dark:border-gray-700 rounded overflow-hidden h-full">
        <Editor
          height="100%"
          defaultLanguage="json"
          value={formatResponseBody(body || '')}
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
