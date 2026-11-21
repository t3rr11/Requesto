/**
 * Helpers for reading and writing files from user interactions.
 *
 * Attached request files are stored as base64 data URLs
 * (`data:<mime>;base64,<payload>`) so they survive JSON transport to the
 * proxy backend, which decodes them into Buffers when building the multipart
 * body.
 */

export function downloadJSON(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function readJSONFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        resolve(JSON.parse(e.target?.result as string));
      } catch {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Read a File as a base64 data URL.
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error(`Could not read file "${file.name}"`));
    reader.readAsDataURL(file);
  });
}

/**
 * Estimate the byte size of a file stored as a base64 data URL.
 * Returns null when the data URL is empty or malformed.
 */
export function estimateDataUrlSize(dataUrl: string | undefined): number | null {
  if (!dataUrl) return null;
  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex === -1) return null;

  const base64 = dataUrl.slice(commaIndex + 1).replace(/=+$/, '');
  if (!base64) return null;
  return Math.floor((base64.length * 3) / 4);
}

/**
 * Format a byte count for display, e.g. `512 B`, `1.2 MB`.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;

  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unitIndex]}`;
}
