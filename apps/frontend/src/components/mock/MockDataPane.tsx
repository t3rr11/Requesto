import { useEffect, useState } from 'react';
import { RefreshCw, Save, AlertTriangle } from 'lucide-react';
import { Button } from '../Button';
import { CodeEditor } from '../CodeEditor';
import { MOCK_CONTENT_TYPE_LANGUAGES, MOCK_CONTENT_TYPE_LABELS } from '../../helpers/mock';
import { useMockStore } from '../../store/mock/store';
import { useAlertStore } from '../../store/alert/store';
import type { MockEndpoint, MockHttpMethod, MockContentType, MockStaticResponse } from '../../store/mock/types';

const HEADER_CLASS =
  'flex items-center justify-between gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-700 h-14 shrink-0';

interface MockDataPaneProps {
  endpoint: MockEndpoint;
  method: MockHttpMethod;
  onStaticChange: (method: MockHttpMethod, next: MockStaticResponse) => void;
  onMissingIdCountChange: (count: number) => void;
}

export function MockDataPane({
  endpoint,
  method,
  onStaticChange,
  onMissingIdCountChange,
}: Readonly<MockDataPaneProps>) {
  if (endpoint.mode === 'dynamic') {
    return <DatasetPane endpoint={endpoint} onMissingIdCountChange={onMissingIdCountChange} />;
  }
  const staticResponse = endpoint.methods[method];
  if (staticResponse) {
    return (
      <StaticBodyPane
        endpoint={endpoint}
        method={method}
        value={staticResponse}
        onChange={next => onStaticChange(method, next)}
      />
    );
  }
  return <EmptyPane />;
}

function EmptyPane() {
  return (
    <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500">
      <p className="text-sm">No method selected</p>
    </div>
  );
}

function StaticBodyPane({
  endpoint,
  method,
  value,
  onChange,
}: Readonly<{
  endpoint: MockEndpoint;
  method: MockHttpMethod;
  value: MockStaticResponse;
  onChange: (next: MockStaticResponse) => void;
}>) {
  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
      <div className={HEADER_CLASS}>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          <span>Response Body</span>
          <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
            {method} {endpoint.path}
          </span>
        </h3>
        <div className="flex items-center gap-1">
          {(['json', 'xml', 'html', 'text'] as MockContentType[]).map(type => (
            <Button
              key={type}
              onClick={() => onChange({ ...value, contentType: type })}
              variant={value.contentType === type ? 'primary' : 'ghost'}
              size="sm"
            >
              {MOCK_CONTENT_TYPE_LABELS[type]}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex-1 min-h-0 p-3">
        <CodeEditor
          language={MOCK_CONTENT_TYPE_LANGUAGES[value.contentType]}
          value={value.body}
          onChange={body => onChange({ ...value, body })}
        />
      </div>
    </div>
  );
}

function formatDataset(records: unknown[]): string {
  return records.length > 0 ? JSON.stringify(records, null, 2) : '[]';
}

// Dynamic routes address records by id, so an empty dataset starts with one to edit.
const PLACEHOLDER_RECORDS = [{ id: 1 }];

function DatasetPane({
  endpoint,
  onMissingIdCountChange,
}: Readonly<{ endpoint: MockEndpoint; onMissingIdCountChange: (count: number) => void }>) {
  const { loadDataset, updateDataset, refreshDatasetCount, datasetCounts } = useMockStore();
  const { showAlert } = useAlertStore();

  const [datasetText, setDatasetText] = useState<string | null>(null);
  const [savedText, setSavedText] = useState<string | null>(null);
  const [isSavingData, setIsSavingData] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = async () => {
    try {
      const records = await loadDataset(endpoint.id);
      const text = formatDataset(records);
      setDatasetText(records.length === 0 ? formatDataset(PLACEHOLDER_RECORDS) : text);
      setSavedText(text);
      setLoadFailed(false);
      void refreshDatasetCount(endpoint.id);
    } catch {
      setLoadFailed(true);
      showAlert('Mock Server', 'Failed to load endpoint data', 'error');
    }
  };

  useEffect(() => {
    void load();
  }, [endpoint.id]);

  const parsed = datasetText === null ? null : parseDataset(datasetText);
  const records = parsed?.valid ? parsed.records : null;
  const hasParseError = parsed !== null && !parsed.valid;
  const count = datasetCounts[endpoint.id];
  const isDirty = datasetText !== savedText;
  const missingIdCount = records ? records.filter(hasNoId).length : 0;

  useEffect(() => {
    onMissingIdCountChange(missingIdCount);
  }, [missingIdCount, onMissingIdCountChange]);

  useEffect(() => () => onMissingIdCountChange(0), [onMissingIdCountChange]);

  let countLabel = '—';
  if (count !== undefined) {
    countLabel = `${count} record${count === 1 ? '' : 's'}`;
  }

  const handleSaveData = async () => {
    if (!records) return;
    setIsSavingData(true);
    const success = await updateDataset(endpoint.id, records);
    setIsSavingData(false);
    if (!success) return;
    setDatasetText(formatDataset(records));
    setSavedText(formatDataset(records));
    showAlert('Success', 'Data saved', 'success');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (isDirty && records && !isSavingData) {
          void handleSaveData();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isDirty, records, isSavingData, handleSaveData]);

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
      <div className={HEADER_CLASS}>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          <span>Data</span>
          <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">{countLabel}</span>
          {isDirty && (
            <span className="ml-2 inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-3 h-3" />
              Unsaved
            </span>
          )}
        </h3>
        <div className="flex items-center gap-1.5">
          <Button onClick={load} variant="ghost" size="sm" title="Reload the dataset from the server, discarding edits">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button
            onClick={handleSaveData}
            variant="primary"
            size="sm"
            loading={isSavingData}
            disabled={!records || !isDirty || isSavingData}
          >
            <Save className="w-4 h-4" />
            Save
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 p-3 flex flex-col">
        {datasetText === null && loadFailed && (
          <div className="m-auto flex flex-col items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
            <p>Failed to load records</p>
            <Button onClick={load} variant="secondary" size="sm">
              <RefreshCw className="w-4 h-4" />
              Retry
            </Button>
          </div>
        )}

        {datasetText === null && !loadFailed && (
          <p className="m-auto text-sm text-gray-400 dark:text-gray-500">Loading records...</p>
        )}

        {datasetText !== null && (
          <>
            {hasParseError && (
              <div className="mb-2 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Invalid JSON — fix the syntax before saving. Records must be an array of objects.
              </div>
            )}
            <div className="flex-1 min-h-0">
              <CodeEditor language="json" value={datasetText} onChange={next => setDatasetText(next)} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function hasNoId(record: Record<string, unknown>): boolean {
  return record.id === undefined || record.id === null || record.id === '';
}

type ParseResult = { valid: true; records: Record<string, unknown>[] } | { valid: false; records: null };

function parseDataset(text: string): ParseResult {
  if (text.trim() === '') return { valid: true, records: [] };
  try {
    const parsed: unknown = JSON.parse(text);
    if (!Array.isArray(parsed)) return { valid: false, records: null };
    if (parsed.some(r => typeof r !== 'object' || r === null || Array.isArray(r))) {
      return { valid: false, records: null };
    }
    return { valid: true, records: parsed as Record<string, unknown>[] };
  } catch {
    return { valid: false, records: null };
  }
}
