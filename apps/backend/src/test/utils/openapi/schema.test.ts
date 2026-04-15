import { describe, it, expect } from 'vitest';
import { generateExampleFromSchema } from '../../../utils/openapi/schema';

describe('generateExampleFromSchema', () => {
  it('returns example value when schema has an example', () => {
    const schema = { type: 'string' as const, example: 'hello' };
    expect(generateExampleFromSchema(schema)).toBe('hello');
  });

  it('returns first enum value', () => {
    const schema = { type: 'string' as const, enum: ['dog', 'cat', 'bird'] };
    expect(generateExampleFromSchema(schema)).toBe('dog');
  });

  it('generates string example', () => {
    expect(generateExampleFromSchema({ type: 'string' })).toBe('string');
  });

  it('generates formatted string examples', () => {
    expect(generateExampleFromSchema({ type: 'string', format: 'date' })).toBe('2024-01-01');
    expect(generateExampleFromSchema({ type: 'string', format: 'date-time' })).toBe('2024-01-01T00:00:00Z');
    expect(generateExampleFromSchema({ type: 'string', format: 'email' })).toBe('user@example.com');
    expect(generateExampleFromSchema({ type: 'string', format: 'uri' })).toBe('https://example.com');
    expect(generateExampleFromSchema({ type: 'string', format: 'uuid' })).toBe('00000000-0000-0000-0000-000000000000');
    expect(generateExampleFromSchema({ type: 'string', format: 'binary' })).toBe('');
  });

  it('generates integer and number as 0', () => {
    expect(generateExampleFromSchema({ type: 'integer' })).toBe(0);
    expect(generateExampleFromSchema({ type: 'number' })).toBe(0);
  });

  it('generates boolean as false', () => {
    expect(generateExampleFromSchema({ type: 'boolean' })).toBe(false);
  });

  it('generates object with properties', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const },
        age: { type: 'integer' as const },
        active: { type: 'boolean' as const },
      },
    };
    expect(generateExampleFromSchema(schema)).toEqual({
      name: 'string',
      age: 0,
      active: false,
    });
  });

  it('generates array with items', () => {
    const schema = {
      type: 'array' as const,
      items: { type: 'string' as const },
    };
    expect(generateExampleFromSchema(schema)).toEqual(['string']);
  });

  it('generates nested object with array', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const, example: 'Buddy' },
        tags: {
          type: 'array' as const,
          items: { type: 'string' as const },
        },
      },
    };
    expect(generateExampleFromSchema(schema)).toEqual({
      name: 'Buddy',
      tags: ['string'],
    });
  });

  it('handles circular references gracefully', () => {
    const schema: Record<string, unknown> = {
      type: 'object',
      properties: {},
    };
    // Create circular ref
    (schema.properties as Record<string, unknown>).self = schema;
    // Should not throw or infinite-loop
    const result = generateExampleFromSchema(schema as any);
    expect(result).toEqual({ self: {} });
  });

  it('returns empty object for undefined schema', () => {
    expect(generateExampleFromSchema(undefined)).toEqual({});
  });

  it('skips $ref properties', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const },
        related: { $ref: '#/components/schemas/Other' },
      },
    };
    const result = generateExampleFromSchema(schema);
    expect(result).toEqual({ name: 'string' });
    expect(result).not.toHaveProperty('related');
  });
});
