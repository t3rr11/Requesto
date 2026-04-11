import { describe, it, expect } from 'vitest';
import { newRequestSchema, saveRequestSchema } from '../../../forms/schemas/requestSchemas';

describe('newRequestSchema', () => {
  it('accepts valid data', () => {
    const result = newRequestSchema.safeParse({
      name: 'Get Users',
      method: 'GET',
      collectionId: 'col-1',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid data with folderId', () => {
    const result = newRequestSchema.safeParse({
      name: 'Create User',
      method: 'POST',
      collectionId: 'col-1',
      folderId: 'folder-1',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.folderId).toBe('folder-1');
    }
  });

  it('rejects empty name', () => {
    const result = newRequestSchema.safeParse({
      name: '',
      method: 'GET',
      collectionId: 'col-1',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Request name is required');
    }
  });

  it('rejects invalid HTTP method', () => {
    const result = newRequestSchema.safeParse({
      name: 'Test',
      method: 'INVALID',
      collectionId: 'col-1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty collectionId', () => {
    const result = newRequestSchema.safeParse({
      name: 'Test',
      method: 'GET',
      collectionId: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Please select a collection');
    }
  });

  it('accepts all valid HTTP methods', () => {
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;
    for (const method of methods) {
      const result = newRequestSchema.safeParse({
        name: 'Test',
        method,
        collectionId: 'col-1',
      });
      expect(result.success).toBe(true);
    }
  });
});

describe('saveRequestSchema', () => {
  it('accepts valid data', () => {
    const result = saveRequestSchema.safeParse({
      name: 'GET /users',
      collectionId: 'col-1',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = saveRequestSchema.safeParse({
      name: '',
      collectionId: 'col-1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty collectionId', () => {
    const result = saveRequestSchema.safeParse({
      name: 'Test',
      collectionId: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Please select a collection');
    }
  });

  it('trims name whitespace', () => {
    const result = saveRequestSchema.safeParse({
      name: '  GET /users  ',
      collectionId: 'col-1',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('GET /users');
    }
  });
});
