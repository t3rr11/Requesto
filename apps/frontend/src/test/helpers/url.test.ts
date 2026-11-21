import { describe, it, expect } from 'vitest';
import { extractPathnameFromUrl, extractParamsFromUrl, mergeParamsFromUrl, setUrlQueryParams } from '../../helpers/url';
import type { UrlParamRow } from '../../helpers/url';

function row(id: string, key: string, value: string, enabled = true): UrlParamRow {
  return { id, key, value, enabled };
}

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

describe('setUrlQueryParams', () => {
  it('appends the enabled rows to a URL without a query string', () => {
    const url = setUrlQueryParams('https://example.com/path', [
      row('1', 'page', '1'),
      row('2', 'limit', '10'),
    ]);
    expect(url).toBe('https://example.com/path?page=1&limit=10');
  });

  it('replaces an existing query string with the enabled rows', () => {
    const url = setUrlQueryParams('https://example.com/path?old=1', [row('1', 'new', '2')]);
    expect(url).toBe('https://example.com/path?new=2');
  });

  it('keeps the base URL exactly as written, including placeholders', () => {
    const url = setUrlQueryParams('{{baseUrl}}/users?debug=1', [row('1', 'page', '2')]);
    expect(url).toBe('{{baseUrl}}/users?page=2');
  });

  it('excludes disabled rows and rows with empty keys', () => {
    const url = setUrlQueryParams('https://example.com/path', [
      row('1', 'on', 'yes'),
      row('2', 'off', 'no', false),
      row('3', '', 'ignored'),
    ]);
    expect(url).toBe('https://example.com/path?on=yes');
  });

  it('returns the bare base URL when no rows are enabled', () => {
    const url = setUrlQueryParams('https://example.com/path?old=1', [row('1', 'off', 'x', false)]);
    expect(url).toBe('https://example.com/path');
  });

  it('escapes characters that would change how the query parses', () => {
    const url = setUrlQueryParams('https://example.com/path', [
      row('1', 'a&b', '1&2&3#4'),
      row('2', 'k', '50%+x'),
    ]);

    // GOTCHA: `=` is kept literal inside values: URL parsers split each pair on the
    // first `=` only, so it round-trips without escaping.
    expect(url).toBe('https://example.com/path?a%26b=1%262%263%234&k=50%25%2Bx');
  });

  it('preserves the fragment when rebuilding the query', () => {
    const url = setUrlQueryParams('https://example.com/path?old=1#section', [row('1', 'page', '2')]);
    expect(url).toBe('https://example.com/path?page=2#section');
  });
});

describe('mergeParamsFromUrl', () => {
  it('returns parsed params followed by a placeholder row when there are no existing rows', () => {
    const rows = mergeParamsFromUrl('https://example.com?foo=bar', []);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ key: 'foo', value: 'bar', enabled: true });
    expect(rows[0].id).toBeTruthy();
    expect(rows[1]).toMatchObject({ key: '', value: '', enabled: true });
  });

  it('keeps the id of an existing row when its key matches and updates the value', () => {
    const rows = mergeParamsFromUrl('https://example.com?foo=updated', [row('row-1', 'foo', 'bar')]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ id: 'row-1', key: 'foo', value: 'updated', enabled: true });
    expect(rows[1]).toMatchObject({ key: '', value: '' });
  });

  it('reuses the placeholder row so the first typed param becomes the first row', () => {
    const rows = mergeParamsFromUrl('https://example.com?test=1', [row('row-1', '', '')]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ id: 'row-1', key: 'test', value: '1', enabled: true });
    expect(rows[1]).toMatchObject({ key: '', value: '' });
  });

  it('keeps exactly one trailing placeholder row when several exist', () => {
    const rows = mergeParamsFromUrl('https://example.com?a=1', [
      row('row-1', '', ''),
      row('row-2', '', ''),
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ id: 'row-1', key: 'a', value: '1' });
    expect(rows[1]).toMatchObject({ key: '', value: '' });
  });

  it('returns a placeholder row when the query string is removed from the URL', () => {
    const rows = mergeParamsFromUrl('https://example.com', [row('row-1', 'test', '1')]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ key: '', value: '', enabled: true });
  });

  it('re-enables a disabled row whose key is typed back into the URL', () => {
    const rows = mergeParamsFromUrl('https://example.com?foo=new', [row('row-1', 'foo', 'old', false)]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ id: 'row-1', enabled: true, value: 'new' });
    expect(rows[1]).toMatchObject({ key: '', value: '' });
  });

  it('adds parsed keys that are missing and removes enabled keys that vanished', () => {
    const rows = mergeParamsFromUrl('https://example.com?new=1', [
      row('row-1', 'gone', 'x'),
      row('row-2', '', ''),
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ id: 'row-2', key: 'new', value: '1' });
    expect(rows[1]).toMatchObject({ key: '', value: '' });
  });

  it('preserves disabled rows even when they are not in the URL', () => {
    const rows = mergeParamsFromUrl('https://example.com?on=1', [
      row('row-1', 'on', '1'),
      row('row-2', 'off', '0', false),
    ]);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ id: 'row-1', key: 'on', enabled: true });
    expect(rows[1]).toMatchObject({ id: 'row-2', key: 'off', enabled: false });
    expect(rows[2]).toMatchObject({ key: '', value: '', enabled: true });
  });

  it('handles duplicate keys in the URL by adding an extra row', () => {
    const rows = mergeParamsFromUrl('https://example.com?a=1&a=2', [row('row-1', 'a', '0')]);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ id: 'row-1', key: 'a', value: '1' });
    expect(rows[1]).toMatchObject({ key: 'a', value: '2' });
    expect(rows[2]).toMatchObject({ key: '', value: '' });
  });

  it('round-trips with setUrlQueryParams', () => {
    const rows = [row('1', 'page', '1'), row('2', 'search', 'hello world')];
    const url = setUrlQueryParams('https://example.com/path', rows);
    const merged = mergeParamsFromUrl(url, rows);
    expect(merged.slice(0, rows.length)).toEqual(rows);
    expect(merged).toHaveLength(rows.length + 1);
    expect(merged[rows.length]).toMatchObject({ key: '', value: '', enabled: true });
  });

  it('round-trips values containing special characters', () => {
    const rows = [row('1', 'expr', 'a&b=c#d 50%+x')];
    const url = setUrlQueryParams('https://example.com/path', rows);
    const merged = mergeParamsFromUrl(url, rows);
    expect(merged[0]).toEqual(rows[0]);
  });
});
