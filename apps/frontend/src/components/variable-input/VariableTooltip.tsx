interface VariableTooltipProps {
  show: boolean;
  x: number;
  y: number;
  variableKey: string;
  variableValue: string;
  isSecret: boolean;
  environmentName?: string;
}

export function VariableTooltip({
  show,
  x,
  y,
  variableKey,
  variableValue,
  isSecret,
  environmentName,
}: VariableTooltipProps) {
  if (!show) return null;

  return (
    <div
      className="fixed z-60 bg-gray-900 dark:bg-black text-white px-3 py-2 rounded-lg shadow-lg max-w-sm border border-gray-700 dark:border-gray-800"
      style={{ left: `${x}px`, top: `${y}px` }}
    >
      <div className="text-xs font-medium text-gray-300 dark:text-gray-400 mb-1">Variable</div>
      <div className="font-mono text-sm font-semibold mb-2">{variableKey}</div>
      <div className="text-xs text-gray-300 dark:text-gray-400 mb-1">Value</div>
      <div className="text-sm break-all">{isSecret ? '••••••••' : variableValue || '(empty)'}</div>
      {environmentName && (
        <>
          <div className="text-xs text-gray-300 dark:text-gray-400 mt-2 mb-1">Environment</div>
          <div className="text-sm">{environmentName}</div>
        </>
      )}
    </div>
  );
}
