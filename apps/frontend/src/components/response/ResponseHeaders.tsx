interface ResponseHeadersProps {
  headers: Record<string, string>;
}

export function ResponseHeaders({ headers }: ResponseHeadersProps) {
  const entries = Object.entries(headers);

  return (
    <div className="p-6 overflow-y-auto h-full">
      {entries.length > 0 ? (
        <div className="space-y-2">
          {entries.map(([key, value]) => (
            <div
              key={key}
              className="flex gap-4 text-sm border-b border-gray-100 dark:border-gray-800 pb-2"
            >
              <span className="font-medium text-gray-700 dark:text-gray-300 min-w-50">
                {key}
              </span>
              <span className="text-gray-600 dark:text-gray-400 flex-1 break-all">{value}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">No headers</p>
      )}
    </div>
  );
}
