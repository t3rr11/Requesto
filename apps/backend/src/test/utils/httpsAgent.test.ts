import { describe, it, expect } from 'vitest';
import https from 'node:https';
import { getHttpsAgent } from '../../utils/httpsAgent';

describe('getHttpsAgent', () => {
  it('returns undefined when insecureTls is false', () => {
    expect(getHttpsAgent(false)).toBeUndefined();
  });

  it('returns undefined when insecureTls is omitted', () => {
    expect(getHttpsAgent()).toBeUndefined();
  });

  it('returns an https.Agent with rejectUnauthorized=false when insecureTls is true', () => {
    const agent = getHttpsAgent(true);
    expect(agent).toBeInstanceOf(https.Agent);
    expect((agent as https.Agent & { options: { rejectUnauthorized: boolean } }).options.rejectUnauthorized).toBe(false);
  });
});
