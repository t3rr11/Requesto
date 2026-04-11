import { describe, it, expect } from 'vitest';
import { formatResponseBody, getStatusBadgeColor, formatBytes } from '../../helpers/response';

describe('formatResponseBody', () => {
  it('formats JSON strings with indentation', () => {
    expect(formatResponseBody('{"a":1}')).toBe('{\n  "a": 1\n}');
  });

  it('returns original if already formatted', () => {
    const formatted = '{\n  "a": 1\n}';
    expect(formatResponseBody(formatted)).toBe(formatted);
  });

  it('returns raw text for non-JSON content', () => {
    expect(formatResponseBody('<html></html>')).toBe('<html></html>');
  });
});

describe('getStatusBadgeColor', () => {
  it('returns green for 2xx', () => {
    expect(getStatusBadgeColor(200)).toContain('green');
  });

  it('returns blue for 3xx', () => {
    expect(getStatusBadgeColor(301)).toContain('blue');
  });

  it('returns orange for 4xx', () => {
    expect(getStatusBadgeColor(404)).toContain('orange');
  });

  it('returns red for 5xx', () => {
    expect(getStatusBadgeColor(500)).toContain('red');
  });

  it('returns red for 0 (connection error)', () => {
    expect(getStatusBadgeColor(0)).toContain('red');
  });
});

describe('formatBytes', () => {
  it('formats 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB');
  });

  it('formats megabytes', () => {
    expect(formatBytes(1048576)).toBe('1 MB');
  });

  it('formats with decimals', () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
  });
});
