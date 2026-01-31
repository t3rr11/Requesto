import Editor from '@monaco-editor/react';
import { formatResponseBody } from '../../helpers/responseHelpers';
import { useTabsStore } from '../../store/useTabsStore';

export function ResponseBody() {
  const { getActiveTab } = useTabsStore();
  const activeTab = getActiveTab();
  const response = activeTab?.response || null;

  return (
    <div className="h-full p-6">
      <div className="border border-gray-300 rounded overflow-hidden h-full">
        <Editor
          height="100%"
          defaultLanguage="json"
          value={formatResponseBody(response?.body || '')}
          theme="vs-light"
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
