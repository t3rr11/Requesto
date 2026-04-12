import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from './Button';
import { VariableAwareInput } from './VariableAwareInput';

type KeyValueRow = {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
};

interface KeyValueEditorProps {
  items: KeyValueRow[];
  onItemsChange: (items: KeyValueRow[]) => void;
  delimiter?: ':' | '=';
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  addLabel?: string;
  bulkPlaceholder?: string;
  disabled?: boolean;
}

function createEmptyRow(): KeyValueRow {
  return { id: Date.now().toString(), key: '', value: '', enabled: true };
}

export function KeyValueEditor({
  items,
  onItemsChange,
  delimiter = ':',
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
  addLabel = '+ Add Row',
  bulkPlaceholder,
  disabled = false,
}: KeyValueEditorProps) {
  const [viewMode, setViewMode] = useState<'table' | 'bulk'>('table');
  const [bulkText, setBulkText] = useState('');

  const handleAdd = () => {
    onItemsChange([...items, createEmptyRow()]);
  };

  const handleUpdate = (id: string, field: 'key' | 'value' | 'enabled', value: string | boolean) => {
    onItemsChange(items.map(item => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const handleRemove = (id: string) => {
    const filtered = items.filter(item => item.id !== id);
    onItemsChange(filtered.length === 0 ? [createEmptyRow()] : filtered);
  };

  const handleSwitchToBulk = () => {
    const text = items
      .filter(item => item.key.trim() || item.value.trim())
      .map(item => `${item.key}${delimiter}${item.value}`)
      .join('\n');
    setBulkText(text);
    setViewMode('bulk');
  };

  const parseBulkText = (text: string): KeyValueRow[] => {
    const lines = text.split('\n').filter(line => line.trim());
    return lines.map((line, index) => {
      const delimiterIndex = line.indexOf(delimiter);
      if (delimiterIndex === -1) {
        return { id: (Date.now() + index).toString(), key: line.trim(), value: '', enabled: true };
      }
      return {
        id: (Date.now() + index).toString(),
        key: line.substring(0, delimiterIndex).trim(),
        value: line.substring(delimiterIndex + 1).trim(),
        enabled: true,
      };
    });
  };

  const handleBulkTextChange = (text: string) => {
    setBulkText(text);
    const parsed = parseBulkText(text);
    onItemsChange(parsed.length > 0 ? parsed : [createEmptyRow()]);
  };

  const handleSwitchToTable = () => {
    const parsed = parseBulkText(bulkText);
    onItemsChange(parsed.length > 0 ? parsed : [createEmptyRow()]);
    setViewMode('table');
  };

  const defaultBulkPlaceholder =
    bulkPlaceholder ??
    (delimiter === ':'
      ? 'Content-Type:application/json\nAuthorization:Bearer token'
      : 'page=1\nlimit=10\nsearch=query');

  if (viewMode === 'bulk') {
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center mb-2">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            One entry per line:{' '}
            <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-xs dark:text-gray-300">
              key{delimiter}value
            </code>
          </p>
          <Button onClick={handleSwitchToTable} variant="ghost" size="sm" disabled={disabled}>
            Table View
          </Button>
        </div>
        <textarea
          value={bulkText}
          onChange={e => handleBulkTextChange(e.target.value)}
          placeholder={defaultBulkPlaceholder}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono dark:bg-gray-800 dark:text-gray-200"
          rows={12}
          disabled={disabled}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="border border-gray-300 dark:border-gray-700 rounded">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <th className="w-10 py-2 px-3" />
              <th className="text-left text-xs font-medium text-gray-600 dark:text-gray-400 py-2 px-3">
                {keyPlaceholder}
              </th>
              <th className="text-left text-xs font-medium text-gray-600 dark:text-gray-400 py-2 px-3">
                {valuePlaceholder}
              </th>
              <th className="w-32 text-right py-2 px-3">
                <Button
                  onClick={handleSwitchToBulk}
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  className="whitespace-nowrap"
                >
                  Bulk Edit
                </Button>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                <td className="py-2 px-3 text-center">
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={e => handleUpdate(item.id, 'enabled', e.target.checked)}
                    className="w-4 h-4"
                    disabled={disabled}
                  />
                </td>
                <td className="py-2 px-1">
                  <input
                    type="text"
                    value={item.key}
                    onChange={e => handleUpdate(item.id, 'key', e.target.value)}
                    placeholder={keyPlaceholder}
                    className="w-full px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 bg-transparent border-none text-black dark:text-gray-200"
                    disabled={disabled}
                  />
                </td>
                <td className="py-2 px-1">
                  <VariableAwareInput
                    value={item.value}
                    onChange={value => handleUpdate(item.id, 'value', value)}
                    placeholder={valuePlaceholder}
                    className="w-full px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 bg-transparent border-none text-black dark:text-gray-200"
                    disabled={disabled}
                  />
                </td>
                <td className="py-2 px-3 text-right">
                  <Button
                    onClick={() => handleRemove(item.id)}
                    variant="icon"
                    size="sm"
                    disabled={disabled}
                    title="Delete row"
                    className="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button onClick={handleAdd} variant="ghost" size="sm" disabled={disabled} className="mt-2">
        {addLabel}
      </Button>
    </div>
  );
}

export type { KeyValueRow };
