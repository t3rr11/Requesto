/**
 * Parse headers from various text formats
 * Supports: JSON, curl -H format, and standard Key: Value format
 */
export function parseHeaders(
  text: string,
  selectedFormat: 'auto' | 'keyvalue' | 'json'
): { headers: Array<{ key: string; value: string }>; error: string | null } {
  const headers: Array<{ key: string; value: string }> = [];
  let error: string | null = null;

  try {
    // Try JSON format
    if (selectedFormat === 'json' || (selectedFormat === 'auto' && text.trim().startsWith('{'))) {
      const parsed = JSON.parse(text);
      Object.entries(parsed).forEach(([key, value]) => {
        headers.push({ key, value: String(value) });
      });
      return { headers, error };
    }

    // Parse line by line
    const lines = text.split('\n').filter(line => line.trim());

    for (const line of lines) {
      // curl -H format: -H "Header: Value" or -H 'Header: Value'
      if (line.includes('-H') || line.includes('--header')) {
        const match =
          line.match(/[-]H\s+["']([^:]+):\s*([^"']+)["']/i) || line.match(/--header\s+["']([^:]+):\s*([^"']+)["']/i);
        if (match) {
          headers.push({ key: match[1].trim(), value: match[2].trim() });
          continue;
        }
      }

      // Standard "Key: Value" format
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
  } catch (err) {
    error = 'Failed to parse headers. Check format and try again.';
  }

  return { headers, error };
}
