import { useState, useCallback, type KeyboardEvent } from 'react';
import {
  useFieldArray,
  Controller,
  type Control,
  type FieldValues,
  type ArrayPath,
  type FieldPath,
  type FieldArray,
} from 'react-hook-form';
import { Plus, Trash2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Button } from './Button';

interface VariableEditorProps<T extends FieldValues> {
  control: Control<T>;
  fieldArrayName?: ArrayPath<T>;
}

export function VariableEditor<T extends FieldValues>({
  control,
  fieldArrayName = 'variables' as ArrayPath<T>,
}: VariableEditorProps<T>) {
  const { fields, append, remove } = useFieldArray({ control, name: fieldArrayName });
  const [showSecrets, setShowSecrets] = useState<Record<number, boolean>>({});
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const handleToggleSecret = (index: number) => {
    setShowSecrets(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const handleAddVariable = useCallback(() => {
    append({
      key: '',
      value: '',
      enabled: true,
      isSecret: false,
    } as FieldArray<T, ArrayPath<T>>);

    // Focus the new row's name input after React renders it
    requestAnimationFrame(() => {
      const inputs = document.querySelectorAll<HTMLInputElement>('[data-variable-name-input]');
      inputs[inputs.length - 1]?.focus();
    });
  }, [append]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>, index: number, column: 'name' | 'value') => {
      if (e.key === 'Enter' && index === fields.length - 1 && column === 'value') {
        e.preventDefault();
        handleAddVariable();
      }
      if (e.key === 'Tab' && !e.shiftKey && column === 'value' && index === fields.length - 1) {
        e.preventDefault();
        handleAddVariable();
      }
    },
    [fields.length, handleAddVariable],
  );

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Variables</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Reference with{' '}
              <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono dark:text-gray-300">
                {'{{variable_name}}'}
              </code>
            </p>
          </div>
          <Button
            type="button"
            onClick={handleAddVariable}
            variant="secondary"
            size="sm"
            className="flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Variable
          </Button>
        </div>

        {fields.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
            <AlertCircle className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">No variables defined</p>
            <Button
              type="button"
              onClick={handleAddVariable}
              variant="primary"
              size="sm"
              className="flex items-center gap-2 mx-auto"
            >
              <Plus className="w-4 h-4" />
              Add Variable
            </Button>
          </div>
        ) : (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[36px_1fr_1fr_36px_36px] bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <div className="px-2 py-2 flex items-center justify-center" title="Enabled" />
              <div className="px-3 py-2">Name</div>
              <div className="px-3 py-2">Value</div>
              <div className="px-1 py-2 flex items-center justify-center" title="Secret" />
              <div className="px-1 py-2" />
            </div>

            {/* Table rows */}
            {fields.map((field, index) => (
              <div
                key={field.id}
                className={`grid grid-cols-[36px_1fr_1fr_36px_36px] items-center border-b border-gray-100 dark:border-gray-800 last:border-b-0 group transition-colors ${
                  hoveredRow === index ? 'bg-gray-50 dark:bg-gray-800/40' : 'bg-white dark:bg-gray-900'
                }`}
                onMouseEnter={() => setHoveredRow(index)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                {/* Enabled checkbox */}
                <div className="px-2 py-1.5 flex items-center justify-center">
                  <Controller
                    name={`${fieldArrayName}.${index}.enabled` as FieldPath<T>}
                    control={control}
                    render={({ field: enabledField }) => (
                      <input
                        type="checkbox"
                        checked={enabledField.value}
                        onChange={enabledField.onChange}
                        className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        title={enabledField.value ? 'Enabled' : 'Disabled'}
                      />
                    )}
                  />
                </div>

                {/* Name input */}
                <div className="py-1">
                  <Controller
                    name={`${fieldArrayName}.${index}.key` as FieldPath<T>}
                    control={control}
                    render={({ field: inputField }) => (
                      <input
                        {...inputField}
                        data-variable-name-input
                        type="text"
                        placeholder="variable_name"
                        onKeyDown={e => handleKeyDown(e, index, 'name')}
                        className="w-full px-3 py-1.5 text-sm bg-transparent border-0 focus:outline-none focus:ring-0 font-mono text-gray-900 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-600"
                      />
                    )}
                  />
                </div>

                {/* Value input */}
                <div className="py-1">
                  <Controller
                    name={`${fieldArrayName}.${index}.value` as FieldPath<T>}
                    control={control}
                    render={({ field: valueField }) => (
                      <Controller
                        name={`${fieldArrayName}.${index}.isSecret` as FieldPath<T>}
                        control={control}
                        render={({ field: secretField }) => (
                          <div className="relative flex items-center">
                            <input
                              {...valueField}
                              type={secretField.value && !showSecrets[index] ? 'password' : 'text'}
                              placeholder="value"
                              onKeyDown={e => handleKeyDown(e, index, 'value')}
                              className="w-full px-3 py-1.5 pr-8 text-sm bg-transparent border-0 focus:outline-none focus:ring-0 font-mono text-gray-900 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-600"
                            />
                            {secretField.value && valueField.value && (
                              <button
                                type="button"
                                onClick={() => handleToggleSecret(index)}
                                className="absolute right-1.5 p-0.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
                              >
                                {showSecrets[index] ? (
                                  <EyeOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        )}
                      />
                    )}
                  />
                </div>

                {/* Secret toggle */}
                <div className="px-1 py-1.5 flex items-center justify-center">
                  <Controller
                    name={`${fieldArrayName}.${index}.isSecret` as FieldPath<T>}
                    control={control}
                    render={({ field: secretField }) => (
                      <button
                        type="button"
                        onClick={() => secretField.onChange(!secretField.value)}
                        className={`p-1 rounded transition-colors ${
                          secretField.value
                            ? 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30'
                            : 'text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400'
                        }`}
                        title={secretField.value ? 'Secret variable' : 'Mark as secret'}
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                      </button>
                    )}
                  />
                </div>

                {/* Delete button */}
                <div className="px-1 py-1.5 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className={`p-1 rounded transition-colors ${
                      hoveredRow === index
                        ? 'text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                        : 'text-transparent'
                    }`}
                    title="Remove variable"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
