import { describe, it, expect } from 'vitest';
import { createMockEndpointSchema, mockEndpointPathSchema } from '../../dtos/mock.dto';

describe('mock endpoint DTOs', () => {
  describe('path validation', () => {
    it.each(['/api/users', '/api/users/:id', '/', '/api/users/me'])('accepts valid path %s', (path) => {
      expect(mockEndpointPathSchema.safeParse(path).success).toBe(true);
    });

    it.each(['', 'api/users', '/api/users?q=1', '/api users', '/users/:', '/api/%20users'])(
      'rejects invalid path %s',
      (path) => {
        expect(mockEndpointPathSchema.safeParse(path).success).toBe(false);
      },
    );
  });

  describe('createMockEndpointSchema', () => {
    it('rejects endpoints without any configured method in static mode', () => {
      const result = createMockEndpointSchema.safeParse({
        name: 'Users',
        path: '/api/users',
        mode: 'static',
        methods: {},
      });
      expect(result.success).toBe(false);
    });

    it('accepts static mode with configured responses', () => {
      const result = createMockEndpointSchema.safeParse({
        name: 'Users',
        path: '/api/users',
        methods: {
          GET: { status: 200, headers: {}, contentType: 'json', body: '[]', delayMs: 0 },
        },
      });
      expect(result.success).toBe(true);
    });

    it('applies defaults to static responses', () => {
      const result = createMockEndpointSchema.safeParse({
        name: 'Users',
        path: '/api/users',
        methods: {
          GET: { status: 404, headers: {}, contentType: 'text', body: 'missing', delayMs: 0 },
        },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.mode).toBe('static');
        expect(result.data.methods.GET?.body).toBe('missing');
      }
    });

    it('clamps status to a valid range', () => {
      const result = createMockEndpointSchema.safeParse({
        name: 'Users',
        path: '/api/users',
        methods: {
          GET: { status: 99999, headers: {}, contentType: 'json', body: '', delayMs: 0 },
        },
      });
      expect(result.success).toBe(false);
    });

    it('accepts dynamic mode without any configured methods', () => {
      const result = createMockEndpointSchema.safeParse({
        name: 'Users',
        path: '/api/users',
        mode: 'dynamic',
        methods: {},
      });
      expect(result.success).toBe(true);
    });
  });
});
