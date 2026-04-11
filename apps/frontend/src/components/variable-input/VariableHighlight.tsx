import type { ReactNode } from 'react';
import type { EnvironmentVariable } from '../../store/environments/types';

interface VariableHighlightProps {
  value: string;
  enabledVariables: EnvironmentVariable[];
  className?: string;
  onVariableHover: (e: React.MouseEvent, varKey: string) => void;
  onVariableLeave: () => void;
  onVariableClick: (varKey: string, instanceIndex: number) => void;
}

export function VariableHighlight({
  value,
  enabledVariables,
  className,
  onVariableHover,
  onVariableLeave,
  onVariableClick,
}: VariableHighlightProps) {
  if (!value) return null;

  const renderHighlightedContent = () => {
    const parts: (string | ReactNode)[] = [];
    let lastIndex = 0;
    const regex = /\{\{([^}]+)\}\}/g;
    let match;
    const variableInstances = new Map<string, number>();

    while ((match = regex.exec(value)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`} className="text-gray-900 dark:text-gray-100">
            {value.substring(lastIndex, match.index)}
          </span>,
        );
      }

      const varKey = match[1].trim();
      const isDefined = enabledVariables.some(v => v.key === varKey);
      const instanceIndex = variableInstances.get(varKey) || 0;
      variableInstances.set(varKey, instanceIndex + 1);

      parts.push(
        <span
          key={`var-${match.index}`}
          spellCheck="false"
          className={`rounded pointer-events-auto cursor-pointer ${
            isDefined
              ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/60'
              : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/60'
          }`}
          onMouseEnter={e => onVariableHover(e, varKey)}
          onMouseLeave={onVariableLeave}
          onClick={() => onVariableClick(varKey, instanceIndex)}
        >
          {match[0]}
        </span>,
      );

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < value.length) {
      parts.push(
        <span key={`text-${lastIndex}`} spellCheck="false" className="text-transparent">
          {value.substring(lastIndex)}
        </span>,
      );
    }

    return parts;
  };

  return (
    <div
      className={`absolute inset-0 pointer-events-none ${className} whitespace-pre overflow-hidden`}
      aria-hidden="true"
    >
      {renderHighlightedContent()}
    </div>
  );
}
