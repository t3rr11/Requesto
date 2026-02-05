import { forwardRef } from 'react';
import { EnvironmentVariable } from '../../store/useEnvironmentStore';
import { Button } from '../Button';

interface VariableSuggestionsProps {
  show: boolean;
  variables: EnvironmentVariable[];
  currentVariable: string;
  onInsert: (varKey: string) => void;
}

export const VariableSuggestions = forwardRef<HTMLDivElement, VariableSuggestionsProps>(
  ({ show, variables, currentVariable, onInsert }, ref) => {
    if (!show) return null;

    const filteredSuggestions = variables.filter(v => v.key.toLowerCase().includes(currentVariable.toLowerCase()));

    if (filteredSuggestions.length === 0) return null;

    return (
      <div ref={ref} className="absolute z-50 mt-1 w-full max-w-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
      <div className="p-2">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2 py-1">Available Variables</div>
        {filteredSuggestions.map(variable => (
          <Button
            key={variable.key}
            type="button"
            onClick={() => onInsert(variable.key)}
            variant="ghost"
            size="md"
            className="w-full justify-start text-left rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 group"
          >
            <div className="flex-1 min-w-0">
              <div className="font-mono text-sm text-gray-900 dark:text-gray-100 font-medium">{variable.key}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {variable.isSecret === true ? '••••••••' : variable.value}
              </div>
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400">Insert</div>
          </Button>
        ))}
      </div>
    </div>
  );
});

VariableSuggestions.displayName = 'VariableSuggestions';
