import { describe, it, expect } from 'vitest';
import { renameSchema } from '../../../forms/schemas/renameSchema';

describe('renameSchema', () => {
  it('accepts a valid name', () => {
    const result = renameSchema.safeParse({ name: 'New Name' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('New Name');
    }
  });

  it('rejects empty name', () => {
    const result = renameSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Name is required');
    }
  });

  it('trims whitespace', () => {
    const result = renameSchema.safeParse({ name: '  trimmed  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('trimmed');
    }
  });

  it('trims whitespace-only name to empty after parse', () => {
    const result = renameSchema.safeParse({ name: '   ' });
    // Zod v4: min(1) validates raw string (length 3 passes), then trim() transforms
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('');
    }
  });
});
