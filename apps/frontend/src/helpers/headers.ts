type ParsedHeader = { key: string; value: string };

type HeaderFormat = 'auto' | 'keyvalue' | 'json';

/**
 * Parse headers from various text formats:
 * - JSON object (`{ "key": "value" }`)
 * - curl `-H "Key: Value"` or `--header "Key: Value"`
 * - Standard `Key: Value` (one per line)
 */
export function parseHeaders(
  text: string,
  selectedFormat: HeaderFormat = 'auto',
): { headers: ParsedHeader[]; error: string | null } {
  const headers: ParsedHeader[] = [];
  let error: string | null = null;

  try {
    if (selectedFormat === 'json' || (selectedFormat === 'auto' && text.trim().startsWith('{'))) {
      const parsed = JSON.parse(text);
      Object.entries(parsed).forEach(([key, value]) => {
        headers.push({ key, value: String(value) });
      });
      return { headers, error };
    }

    const lines = text.split('\n').filter((l) => l.trim());

    for (const line of lines) {
      if (line.includes('-H') || line.includes('--header')) {
        const match =
          line.match(/-H\s+["']([^:]+):\s*([^"']+)["']/i) ||
          line.match(/--header\s+["']([^:]+):\s*([^"']+)["']/i);
        if (match) {
          headers.push({ key: match[1].trim(), value: match[2].trim() });
          continue;
        }
      }

      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        if (key && value) {
          headers.push({ key, value });
        }
      }
    }

    if (headers.length === 0) {
      error = 'No headers found. Use "Key: Value" format, one per line.';
    }
  } catch {
    error = 'Failed to parse headers. Check format and try again.';
  }

  return { headers, error };
}
