import { ChangeEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from './Button';
import { VariableAwareInput } from './VariableAwareInput';
import { estimateDataUrlSize, formatFileSize, readFileAsDataUrl } from '../helpers/file';
import { useAlertStore } from '../store/alert/store';
import type { FormDataEntry } from '../store/request/types';

function createEmptyRow(): FormDataEntry {
  return { id: Date.now().toString(), key: '', value: '', type: 'text', enabled: true };
}

interface FormDataEditorProps {
  items: FormDataEntry[];
  onItemsChange: (items: FormDataEntry[]) => void;
  disabled?: boolean;
  collectionId?: string;
}
export function FormDataEditor({
  items,
  onItemsChange,
  disabled = false,
  collectionId,
}: Readonly<FormDataEditorProps>) {
  const { showAlert } = useAlertStore();

  const handleAdd = () => {
    onItemsChange([...items, createEmptyRow()]);
  };

  const handleUpdate = (id: string, patch: Partial<FormDataEntry>) => {
    onItemsChange(items.map(item => (item.id === id ? { ...item, ...patch } : item)));
  };

  const handleRemove = (id: string) => {
    const filtered = items.filter(item => item.id !== id);
    onItemsChange(filtered.length === 0 ? [createEmptyRow()] : filtered);
  };

  const handleTypeChange = (id: string, type: FormDataEntry['type']) => {
    handleUpdate(id, { type });
  };

  const handleFileChosen = async (id: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    // Reset the input so choosing the same file again re-fires onChange.
    event.target.value = '';
    if (!file) return;

    try {
      const fileContent = await readFileAsDataUrl(file);
      handleUpdate(id, { fileName: file.name, fileContent });
    } catch (error) {
      showAlert('File read failed', error instanceof Error ? error.message : 'Could not read the selected file', 'error');
    }
  };

  return (
    <div className="space-y-2">
      <div className="border border-gray-300 dark:border-gray-700 rounded">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <th className="w-10 py-2 px-3" />
              <th className="text-left text-xs font-medium text-gray-600 dark:text-gray-400 py-2 px-3">Field</th>
              <th className="text-left text-xs font-medium text-gray-600 dark:text-gray-400 py-2 px-3 w-24">Type</th>
              <th className="text-left text-xs font-medium text-gray-600 dark:text-gray-400 py-2 px-3">Value</th>
              <th className="w-12" />
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                <td className="py-1 px-3 text-center">
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={e => handleUpdate(item.id, { enabled: e.target.checked })}
                    className="w-4 h-4 mt-1.5 cursor-pointer"
                    disabled={disabled}
                  />
                </td>
                <td className="py-1 px-1">
                  <input
                    type="text"
                    value={item.key}
                    onChange={e => handleUpdate(item.id, { key: e.target.value })}
                    placeholder="Field"
                    className="w-full px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 bg-transparent border-none text-black dark:text-gray-200"
                    disabled={disabled}
                  />
                </td>
                <td className="py-1 px-1">
                  <select
                    value={item.type}
                    onChange={e => handleTypeChange(item.id, e.target.value as FormDataEntry['type'])}
                    className="w-full px-1 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 cursor-pointer"
                    disabled={disabled}
                  >
                    <option value="text">Text</option>
                    <option value="file">File</option>
                  </select>
                </td>
                <td className="py-1 px-1">
                  {item.type === 'file' ? (
                    <div className="flex items-center gap-2 px-1">
                      {item.fileName ? (
                        <span
                          className="flex-1 min-w-0 truncate text-sm text-gray-700 dark:text-gray-300"
                          title={item.fileName}
                        >
                          {item.fileName}
                          {estimateDataUrlSize(item.fileContent) !== null && (
                            <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">
                              ({formatFileSize(estimateDataUrlSize(item.fileContent) as number)})
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="flex-1 min-w-0 truncate text-sm text-gray-400 dark:text-gray-500">
                          No file selected
                        </span>
                      )}
                      <label className="shrink-0 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
                        Choose file
                        {' '}
                        <input
                          type="file"
                          className="hidden"
                          onChange={event => handleFileChosen(item.id, event)}
                          disabled={disabled}
                        />
                      </label>
                    </div>
                  ) : (
                    <VariableAwareInput
                      value={item.value}
                      onChange={value => handleUpdate(item.id, { value })}
                      placeholder="Value"
                      className="w-full px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 bg-transparent border-none text-black dark:text-gray-200"
                      disabled={disabled}
                      collectionId={collectionId}
                    />
                  )}
                </td>
                <td className="py-1 px-2 text-right">
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
        + Add Field
      </Button>
    </div>
  );
}
