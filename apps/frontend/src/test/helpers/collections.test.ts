import { describe, it, expect } from 'vitest';
import { getMethodColor } from '../../helpers/collections';

describe('getMethodColor', () => {
  it('returns green for GET', () => {
    expect(getMethodColor('GET')).toContain('green');
  });

  it('returns blue for POST', () => {
    expect(getMethodColor('POST')).toContain('blue');
  });

  it('returns orange/yellow for PUT', () => {
    expect(getMethodColor('PUT')).toContain('orange');
  });

  it('returns red for DELETE', () => {
    expect(getMethodColor('DELETE')).toContain('red');
  });

  it('returns purple for PATCH', () => {
    expect(getMethodColor('PATCH')).toContain('purple');
  });

  it('returns a color for HEAD', () => {
    expect(getMethodColor('HEAD')).toBeTruthy();
  });

  it('returns a color for OPTIONS', () => {
    expect(getMethodColor('OPTIONS')).toBeTruthy();
  });

  it('returns gray for unknown methods', () => {
    expect(getMethodColor('UNKNOWN')).toContain('gray');
  });
});
