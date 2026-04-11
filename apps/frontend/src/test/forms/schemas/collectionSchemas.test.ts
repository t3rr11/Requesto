import { describe, it, expect } from 'vitest';
import { newCollectionSchema } from '../../../forms/schemas/collectionSchemas';

describe('newCollectionSchema', () => {
  it('accepts valid data with name only', () => {
    const result = newCollectionSchema.safeParse({ name: 'My Collection' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('My Collection');
    }
  });

  it('accepts valid data with name and description', () => {
    const result = newCollectionSchema.safeParse({
      name: 'My Collection',
      description: 'Test description',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe('Test description');
    }
  });

  it('rejects empty name', () => {
    const result = newCollectionSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Collection name is required');
    }
  });

  it('trims whitespace from name', () => {
    const result = newCollectionSchema.safeParse({ name: '  My Collection  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('My Collection');
    }
  });

  it('allows optional description to be undefined', () => {
    const result = newCollectionSchema.safeParse({ name: 'Test' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBeUndefined();
    }
  });
});
