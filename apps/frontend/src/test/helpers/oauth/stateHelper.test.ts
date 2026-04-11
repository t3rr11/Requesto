import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateState,
  generateNonce,
  storeOAuthState,
  retrieveOAuthState,
  clearAllOAuthStates,
  isValidState,
} from '../../../helpers/oauth/stateHelper';

describe('stateHelper', () => {
  beforeEach(() => {
    clearAllOAuthStates();
  });

  describe('generateState', () => {
    it('generates a non-empty string', () => {
      expect(generateState()).toBeTruthy();
    });

    it('generates unique states', () => {
      expect(generateState()).not.toBe(generateState());
    });
  });

  describe('generateNonce', () => {
    it('generates a non-empty string', () => {
      expect(generateNonce()).toBeTruthy();
    });
  });

  describe('storeOAuthState / retrieveOAuthState', () => {
    it('stores and retrieves a state', () => {
      const state = generateState();
      storeOAuthState({ configId: 'cfg1', state, timestamp: Date.now(), redirectUri: 'http://localhost' });
      const retrieved = retrieveOAuthState(state);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.configId).toBe('cfg1');
    });

    it('returns null for unknown state', () => {
      expect(retrieveOAuthState('unknown')).toBeNull();
    });

    it('removes state after retrieval (one-time use)', () => {
      const state = generateState();
      storeOAuthState({ configId: 'cfg1', state, timestamp: Date.now(), redirectUri: 'http://localhost' });
      retrieveOAuthState(state);
      expect(retrieveOAuthState(state)).toBeNull();
    });
  });

  describe('isValidState', () => {
    it('returns true for valid state string', () => {
      expect(isValidState('abc123')).toBe(true);
    });

    it('returns false for null', () => {
      expect(isValidState(null)).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isValidState('')).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isValidState(undefined)).toBe(false);
    });
  });
});
