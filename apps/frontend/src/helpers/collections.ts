/**
 * Get the Tailwind text-color class for a given HTTP method.
 */
export function getMethodColor(method: string): string {
  const colors: Record<string, string> = {
    GET: 'text-green-600',
    POST: 'text-blue-600',
    PUT: 'text-orange-600',
    PATCH: 'text-purple-600',
    DELETE: 'text-red-600',
    HEAD: 'text-purple-600',
    OPTIONS: 'text-gray-600',
  };
  return colors[method.toUpperCase()] || 'text-gray-600';
}
