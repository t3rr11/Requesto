export const getMethodColor = (method: string): string => {
  const colors: Record<string, string> = {
    GET: 'text-green-600',
    POST: 'text-blue-600',
    PUT: 'text-orange-600',
    PATCH: 'text-purple-600',
    DELETE: 'text-red-600',
  };
  return colors[method] || 'text-gray-600';
};
