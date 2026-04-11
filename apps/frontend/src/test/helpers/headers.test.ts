import { describe, it, expect } from 'vitest';
import { parseHeaders } from '../../helpers/headers';

describe('parseHeaders', () => {
  it('parses JSON format headers', () => {
    const { headers, error } = parseHeaders('{"Content-Type": "application/json", "Accept": "text/html"}');
    expect(error).toBeNull();
    expect(headers).toEqual([
      { key: 'Content-Type', value: 'application/json' },
      { key: 'Accept', value: 'text/html' },
    ]);
  });

  it('parses key:value format headers', () => {
    const { headers, error } = parseHeaders('Content-Type: application/json\nAccept: text/html');
    expect(error).toBeNull();
    expect(headers).toEqual([
      { key: 'Content-Type', value: 'application/json' },
      { key: 'Accept', value: 'text/html' },
    ]);
  });

  it('parses curl -H flag format', () => {
    const { headers, error } = parseHeaders('-H "Content-Type: application/json"\n-H "Accept: text/html"');
    expect(error).toBeNull();
    expect(headers).toEqual([
      { key: 'Content-Type', value: 'application/json' },
      { key: 'Accept', value: 'text/html' },
    ]);
  });

  it('returns error message for empty input', () => {
    const { headers, error } = parseHeaders('');
    expect(headers).toEqual([]);
    expect(error).toBeTruthy();
  });

  it('skips empty lines', () => {
    const { headers } = parseHeaders('Content-Type: application/json\n\nAccept: text/html');
    expect(headers).toHaveLength(2);
  });
});
