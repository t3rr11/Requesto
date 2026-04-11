import { describe, it, expect } from 'vitest';
import {
  getAllProviderTemplates,
  getProviderTemplate,
  createConfigFromTemplate,
  substituteUrlPlaceholders,
  extractUrlPlaceholders,
  MICROSOFT_ENTRAID_TEMPLATE,
  GITHUB_TEMPLATE,
} from '../../../helpers/oauth/providers';

describe('providers', () => {
  describe('getAllProviderTemplates', () => {
    it('returns 5 templates', () => {
      expect(getAllProviderTemplates()).toHaveLength(5);
    });
  });

  describe('getProviderTemplate', () => {
    it('finds by provider name', () => {
      expect(getProviderTemplate('microsoft')).not.toBeNull();
      expect(getProviderTemplate('google')).not.toBeNull();
      expect(getProviderTemplate('github')).not.toBeNull();
    });

    it('returns null for unknown provider', () => {
      expect(getProviderTemplate('nonexistent')).toBeNull();
    });
  });

  describe('createConfigFromTemplate', () => {
    it('creates config with template defaults', () => {
      const config = createConfigFromTemplate(MICROSOFT_ENTRAID_TEMPLATE);
      expect(config.provider).toBe('microsoft');
      expect(config.usePKCE).toBe(true);
      expect(config.tokenStorage).toBe('session');
    });

    it('allows overrides', () => {
      const config = createConfigFromTemplate(GITHUB_TEMPLATE, { tokenStorage: 'local' });
      expect(config.tokenStorage).toBe('local');
    });
  });

  describe('substituteUrlPlaceholders', () => {
    it('replaces {tenant} in URL', () => {
      const result = substituteUrlPlaceholders(
        'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize',
        { tenant: 'my-tenant-id' },
      );
      expect(result).toBe('https://login.microsoftonline.com/my-tenant-id/oauth2/v2.0/authorize');
    });

    it('replaces multiple placeholders', () => {
      const result = substituteUrlPlaceholders('https://{domain}/{path}', { domain: 'example.com', path: 'api' });
      expect(result).toBe('https://example.com/api');
    });
  });

  describe('extractUrlPlaceholders', () => {
    it('extracts placeholder names', () => {
      expect(extractUrlPlaceholders('https://{domain}/oauth2/{version}')).toEqual(['domain', 'version']);
    });

    it('returns empty array when none', () => {
      expect(extractUrlPlaceholders('https://example.com')).toEqual([]);
    });
  });
});
