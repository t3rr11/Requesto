import { useState } from 'react';
import { useFieldArray, Control, Controller } from 'react-hook-form';
import { Plus, Trash2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Button } from './Button';

interface VariableEditorProps {
  control: Control<any>;
  fieldArrayName?: string;
}

export const VariableEditor = ({ control, fieldArrayName = 'variables' }: VariableEditorProps) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: fieldArrayName,
  });

  const [showSecrets, setShowSecrets] = useState<Record<number, boolean>>({});

  const toggleSecretVisibility = (index: number) => {
    setShowSecrets(prev => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const addVariable = () => {
    append({ key: '', value: '', enabled: true, isSecret: false });
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-4">
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
            onClick={addVariable}
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
              onClick={addVariable}
              variant="primary"
              size="sm"
              className="flex items-center gap-2 mx-auto"
            >
              <Plus className="w-4 h-4" />
              Add Variable
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="pt-2">
                    <Controller
                      name={`${fieldArrayName}.${index}.enabled`}
                      control={control}
                      render={({ field: enabledField }) => (
                        <input
                          type="checkbox"
                          checked={enabledField.value}
                          onChange={enabledField.onChange}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                          title={enabledField.value ? 'Enabled' : 'Disabled'}
                        />
                      )}
                    />
                  </div>

                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Name</label>
                      <Controller
                        name={`${fieldArrayName}.${index}.key`}
                        control={control}
                        render={({ field: inputField }) => (
                          <input
                            {...inputField}
                            type="text"
                            placeholder="variable_name"
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono dark:bg-gray-800 dark:text-gray-200"
                          />
                        )}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Value</label>
                      <Controller
                        name={`${fieldArrayName}.${index}.value`}
                        control={control}
                        render={({ field: valueField }) => (
                          <Controller
                            name={`${fieldArrayName}.${index}.isSecret`}
                            control={control}
                            render={({ field: secretField }) => (
                              <div className="relative">
                                <input
                                  {...valueField}
                                  type={secretField.value && !showSecrets[index] ? 'password' : 'text'}
                                  placeholder="value"
                                  className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono dark:bg-gray-800 dark:text-gray-200"
                                />
                                {secretField.value && valueField.value && (
                                  <Button
                                    type="button"
                                    onClick={() => toggleSecretVisibility(index)}
                                    variant="icon"
                                    size="sm"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
                                  >
                                    {showSecrets[index] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  </Button>
                                )}
                              </div>
                            )}
                          />
                        )}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-7">
                    <Controller
                      name={`${fieldArrayName}.${index}.isSecret`}
                      control={control}
                      render={({ field: secretField }) => (
                        <Button
                          type="button"
                          onClick={() => secretField.onChange(!secretField.value)}
                          variant="icon"
                          size="sm"
                          className={`${
                            secretField.value ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                          title={secretField.value ? 'Secret variable' : 'Mark as secret'}
                        >
                          <EyeOff className="w-4 h-4" />
                        </Button>
                      )}
                    />

                    <Button
                      type="button"
                      onClick={() => remove(index)}
                      variant="icon"
                      size="sm"
                      className="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="Remove variable"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
