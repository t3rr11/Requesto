import { KeyValueEditor, type KeyValueRow } from '../KeyValueEditor';
import type { MockStaticResponse } from '../../store/mock/types';

const LABEL_CLASS = 'block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5';

interface StaticResponseFieldsProps {
  response: MockStaticResponse;
  headerRows: KeyValueRow[];
  onResponseChange: (updates: Partial<MockStaticResponse>) => void;
  onHeaderRowsChange: (rows: KeyValueRow[]) => void;
}

export function StaticResponseFields({
  response,
  headerRows,
  onResponseChange,
  onHeaderRowsChange,
}: Readonly<StaticResponseFieldsProps>) {
  const handleStatusChange = (value: string) => {
    const status = Number.parseInt(value, 10);
    if (!Number.isNaN(status)) {
      onResponseChange({ status });
    }
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex gap-1">
          <p className={LABEL_CLASS}>Response Options -</p>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Set the HTTP status code and optional delay for the response.
          </span>
        </div>
        <div className="flex gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span>Status</span>
            <input
              type="text"
              inputMode="numeric"
              value={response.status}
              onChange={e => handleStatusChange(e.target.value)}
              className="px-2 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 w-24 font-mono"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span>Delay</span>
            <input
              type="text"
              inputMode="numeric"
              value={response.delayMs}
              onChange={e => onResponseChange({ delayMs: Number.parseInt(e.target.value, 10) })}
              className="px-2 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 w-24 font-mono"
            />
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <p className={LABEL_CLASS}>Response headers</p>
        <KeyValueEditor
          items={headerRows}
          onItemsChange={onHeaderRowsChange}
          keyPlaceholder="Header"
          valuePlaceholder="Value"
        />
      </div>
    </div>
  );
}
