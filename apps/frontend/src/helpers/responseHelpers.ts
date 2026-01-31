export const formatResponseBody = (body: string): string => {
  try {
    const parsed = JSON.parse(body);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return body;
  }
};

export const getStatusBadgeColor = (status: number): string => {
  if (status === 0) return 'bg-red-100 text-red-700 border-red-200';
  if (status >= 200 && status < 300) return 'bg-green-100 text-green-700 border-green-200';
  if (status >= 300 && status < 400) return 'bg-blue-100 text-blue-700 border-blue-200';
  if (status >= 400 && status < 500) return 'bg-orange-100 text-orange-700 border-orange-200';
  return 'bg-red-100 text-red-700 border-red-200';
};

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};
