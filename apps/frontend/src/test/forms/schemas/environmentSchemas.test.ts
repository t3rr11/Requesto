import { describe, it, expect } from 'vitest';
import { newEnvironmentSchema } from '../../../forms/schemas/environmentSchemas';

describe('newEnvironmentSchema', () => {
  it('accepts a valid name', () => {
    const result = newEnvironmentSchema.safeParse({ name: 'Production' });
    expect(result.success).toBe(true);
  });

  it('trims whitespace', () => {
    const result = newEnvironmentSchema.safeParse({ name: '  Staging  ' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe('Staging');
  });

  it('rejects empty name', () => {
    const result = newEnvironmentSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });
});
