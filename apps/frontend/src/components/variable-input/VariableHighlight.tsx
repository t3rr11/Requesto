import { EnvironmentVariable } from '../../store/useEnvironmentStore';

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
    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    const regex = /\{\{([^}]+)\}\}/g;
    let match;

    // Track instance indices for each variable key
    const variableInstances = new Map<string, number>();

    while ((match = regex.exec(value)) !== null) {
      // Add text before variable (visible, normal text)
      if (match.index > lastIndex) {
        parts.push(<span key={`text-${lastIndex}`}>{value.substring(lastIndex, match.index)}</span>);
      }

      // Add variable with highlighting
      const varKey = match[1].trim();
      const isDefined = enabledVariables.some(v => v.key === varKey);

      // Get and increment instance index for this variable key
      const instanceIndex = variableInstances.get(varKey) || 0;
      variableInstances.set(varKey, instanceIndex + 1);

      parts.push(
        <span
          key={`var-${match.index}`}
          spellCheck="false"
          className={`rounded pointer-events-auto cursor-pointer ${
            isDefined
              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
          }`}
          onMouseEnter={e => onVariableHover(e, varKey)}
          onMouseLeave={onVariableLeave}
          onClick={() => onVariableClick(varKey, instanceIndex)}
        >
          {match[0]}
        </span>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text (visible, normal text)
    if (lastIndex < value.length) {
      parts.push(
        <span key={`text-${lastIndex}`} spellCheck="false" className="text-transparent">
          {value.substring(lastIndex)}
        </span>
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
