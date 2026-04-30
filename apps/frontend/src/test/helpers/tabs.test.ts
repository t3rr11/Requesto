import { describe, it, expect } from 'vitest';
import {
  areRequestsEqual,
  isTabDirty,
  generateTabLabel,
  savedRequestToTabRequest,
  cloneTabRequest,
} from '../../helpers/tabs';
import type { TabRequest, Tab } from '../../store/tabs/types';

const baseRequest: TabRequest = {
  method: 'GET',
  url: 'https://example.com',
};

const makeTab = (overrides: Partial<Tab> = {}): Tab => ({
  id: '1',
  label: 'Test',
  request: { ...baseRequest },
  response: null,
  isDirty: false,
  isLoading: false,
  error: null,
  lastAccessedAt: Date.now(),
  ...overrides,
});

describe('areRequestsEqual', () => {
  it('returns true for identical requests', () => {
    expect(areRequestsEqual(baseRequest, { ...baseRequest })).toBe(true);
  });

  it('detects method change', () => {
    expect(areRequestsEqual(baseRequest, { ...baseRequest, method: 'POST' })).toBe(false);
  });

  it('detects URL change', () => {
    expect(areRequestsEqual(baseRequest, { ...baseRequest, url: 'https://other.com' })).toBe(false);
  });

  it('detects body change', () => {
    expect(areRequestsEqual(baseRequest, { ...baseRequest, body: '{"a":1}' })).toBe(false);
  });

  it('treats missing auth and {type:"none"} as equal', () => {
    const a: TabRequest = { ...baseRequest };
    const b: TabRequest = { ...baseRequest, auth: { type: 'none' } };
    expect(areRequestsEqual(a, b)).toBe(true);
  });
});

describe('isTabDirty', () => {
  it('returns false for new tab with empty URL', () => {
    const tab = makeTab({ request: { method: 'GET', url: '' } });
    expect(isTabDirty(tab)).toBe(false);
  });

  it('returns true for new tab (no savedRequestId) with typed URL', () => {
    const tab = makeTab({ request: { method: 'GET', url: 'https://example.com' } });
    expect(isTabDirty(tab)).toBe(true);
  });

  it('returns false when request matches original', () => {
    const original: TabRequest = { method: 'GET', url: 'https://example.com' };
    const tab = makeTab({
      savedRequestId: 's1',
      originalRequest: { ...original },
      request: { ...original },
    });
    expect(isTabDirty(tab)).toBe(false);
  });

  it('returns true when request differs from original', () => {
    const original: TabRequest = { method: 'GET', url: 'https://example.com' };
    const tab = makeTab({
      savedRequestId: 's1',
      originalRequest: original,
      request: { ...original, url: 'https://changed.com' },
    });
    expect(isTabDirty(tab)).toBe(true);
  });
});

describe('generateTabLabel', () => {
  it('generates label from URL', () => {
    const label = generateTabLabel(baseRequest);
    expect(label).toBeTruthy();
    expect(typeof label).toBe('string');
  });

  it('returns "New Request" for empty URL', () => {
    expect(generateTabLabel({ method: 'GET', url: '' })).toBe('New Request');
  });

  it('uses name when provided', () => {
    expect(generateTabLabel(baseRequest, 'My Request')).toBe('My Request');
  });
});

describe('savedRequestToTabRequest', () => {
  it('converts saved request to tab request', () => {
    const saved = {
      method: 'POST',
      url: 'https://api.test.com',
      headers: { 'X-Test': 'yes' },
      body: '{}',
    };
    const result = savedRequestToTabRequest(saved);
    expect(result.method).toBe('POST');
    expect(result.url).toBe('https://api.test.com');
    expect(result.body).toBe('{}');
    expect(result.headers).toEqual({ 'X-Test': 'yes' });
  });
});

describe('cloneTabRequest', () => {
  it('creates an independent copy', () => {
    const original: TabRequest = {
      ...baseRequest,
      auth: { type: 'bearer', bearer: { token: 'abc' } },
    };
    const clone = cloneTabRequest(original);
    expect(clone).toEqual(original);
    expect(clone).not.toBe(original);
  });
});
