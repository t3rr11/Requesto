import { describe, it, expect } from 'vitest';
import { extractPathnameFromUrl, extractParamsFromUrl } from '../../helpers/url';

describe('extractPathnameFromUrl', () => {
  it('extracts pathname from a full URL', () => {
    expect(extractPathnameFromUrl('https://example.com/api/users?page=1')).toBe('/api/users');
  });

  it('returns / for a URL with no pathname', () => {
    expect(extractPathnameFromUrl('https://example.com')).toBe('/');
  });

  it('handles relative paths', () => {
    expect(extractPathnameFromUrl('/api/users')).toBe('/api/users');
  });

  it('returns full input on invalid URL', () => {
    expect(extractPathnameFromUrl('not a url')).toBe('not a url');
  });
});

describe('extractParamsFromUrl', () => {
  it('extracts query params as key-value objects', () => {
    const { params } = extractParamsFromUrl('https://example.com?foo=bar&baz=qux');
    expect(params).toEqual([
      { key: 'foo', value: 'bar' },
      { key: 'baz', value: 'qux' },
    ]);
  });

  it('returns baseUrl alongside params', () => {
    const result = extractParamsFromUrl('https://example.com/path?key=val');
    expect(result.baseUrl).toContain('example.com/path');
    expect(result.params).toHaveLength(1);
  });

  it('returns empty params when no query string', () => {
    const { params } = extractParamsFromUrl('https://example.com');
    expect(params).toEqual([]);
  });

  it('handles params without values', () => {
    const { params } = extractParamsFromUrl('https://example.com?key=');
    expect(params).toEqual([{ key: 'key', value: '' }]);
  });
});
