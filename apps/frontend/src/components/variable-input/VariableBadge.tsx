interface VariableBadgeProps {
  variableCount: number;
  hasUndefinedVariables: boolean;
}

export function VariableBadge({ variableCount, hasUndefinedVariables }: VariableBadgeProps) {
  if (variableCount === 0) return null;

  return (
    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
      <span
        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          hasUndefinedVariables ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
        }`}
        title={hasUndefinedVariables ? 'Some variables are not defined' : `Using ${variableCount} variable(s)`}
      >
        {variableCount} var{variableCount !== 1 ? 's' : ''}
      </span>
    </div>
  );
}
