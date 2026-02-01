import { forwardRef } from 'react';
import { EnvironmentVariable } from '../../store/useEnvironmentStore';

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
      <div ref={ref} className="absolute z-50 mt-1 w-full max-w-md bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
      <div className="p-2">
        <div className="text-xs font-medium text-gray-500 px-2 py-1">Available Variables</div>
        {filteredSuggestions.map(variable => (
          <button
            key={variable.key}
            type="button"
            onClick={() => onInsert(variable.key)}
            className="w-full text-left px-3 py-2 hover:bg-blue-50 rounded flex items-start justify-between gap-2 group"
          >
            <div className="flex-1 min-w-0">
              <div className="font-mono text-sm text-gray-900 font-medium">{variable.key}</div>
              <div className="text-xs text-gray-500 truncate">
                {variable.isSecret === true ? '••••••••' : variable.value}
              </div>
            </div>
            <div className="text-xs text-gray-400 group-hover:text-blue-600">Insert</div>
          </button>
        ))}
      </div>
    </div>
  );
});

VariableSuggestions.displayName = 'VariableSuggestions';
