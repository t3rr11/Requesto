import { describe, expect, it } from 'vitest';
import { collectRunOptions } from '../src/app.ts';

/**
 * collectRunOptions maps commander's parsed `run` command output onto
 * RunOptions. The critical case is the --no-warn-http-errors negation flag:
 * commander mirrors it as `warnHttpErrors` (true by default, false when the
 * flag is given): a returning `false` must map to noWarnHttpErrors: true,
 * never the other way around.
 */
describe('collectRunOptions', () => {
  it('keeps HTTP-error warnings on by default', () => {
    expect(collectRunOptions('/repo/.requesto', {}).noWarnHttpErrors).toBe(false);
    expect(collectRunOptions('/repo/.requesto', { warnHttpErrors: true }).noWarnHttpErrors).toBe(false);
  });

  it('disables HTTP-error warnings when --no-warn-http-errors is given', () => {
    expect(collectRunOptions('/repo/.requesto', { warnHttpErrors: false }).noWarnHttpErrors).toBe(true);
  });

  it('passes flag values through unchanged', () => {
    const runOptions = collectRunOptions('/repo/.requesto', {
      collection: ['demo'],
      excludeCollection: ['other'],
      folder: ['Users'],
      environment: 'ci',
      var: ['a=1'],
      varFile: '.env',
      token: ['cfg=t'],
      oauthSecret: ['cfg=s'],
      refreshToken: ['cfg=r'],
      bail: true,
      insecure: true,
      timeout: 5000,
      persist: true,
      server: 'http://remote',
    });

    expect(runOptions).toEqual({
      path: '/repo/.requesto',
      collections: ['demo'],
      excludeCollections: ['other'],
      folders: ['Users'],
      environment: 'ci',
      vars: ['a=1'],
      varFile: '.env',
      tokens: ['cfg=t'],
      oauthSecrets: ['cfg=s'],
      refreshTokens: ['cfg=r'],
      bail: true,
      insecure: true,
      timeout: 5000,
      persist: true,
      server: 'http://remote',
      noWarnHttpErrors: false,
    });
  });
});
