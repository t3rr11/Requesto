interface MethodBadgeProps {
  method: string;
}

const METHOD_CLASSES: Record<string, string> = {
  GET: 'bg-green-100  text-green-700  dark:bg-green-900/40  dark:text-green-400',
  POST: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
  PUT: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  PATCH: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  HEAD: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  OPTIONS: 'bg-gray-100 text-gray-600 dark:bg-gray-700/60 dark:text-gray-400',
};

export function MethodBadge({ method }: MethodBadgeProps) {
  const upper = method.toUpperCase();
  const classes = METHOD_CLASSES[upper] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700/60 dark:text-gray-400';
  return (
    <span
      className={`inline-flex items-center text-[10px] font-semibold rounded px-1.5 py-0.5 leading-none shrink-0 ${classes}`}
    >
      {upper}
    </span>
  );
}
