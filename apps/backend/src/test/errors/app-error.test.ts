import { describe, it, expect } from 'vitest';
import { AppError } from '../../errors/app-error';
import { ErrorCode } from '../../errors/error-codes';

describe('AppError', () => {
  it('creates a not found error with correct properties', () => {
    const err = AppError.notFound('Thing not found');
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('Thing not found');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe(ErrorCode.NOT_FOUND);
    expect(err.isOperational).toBe(true);
  });

  it('creates a bad request error', () => {
    const err = AppError.badRequest('Validation failed');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe(ErrorCode.VALIDATION_ERROR);
  });

  it('creates a conflict error', () => {
    const err = AppError.conflict('Already exists');
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe(ErrorCode.CONFLICT);
  });

  it('creates an internal error', () => {
    const err = AppError.internal('Something went wrong');
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe(ErrorCode.INTERNAL_ERROR);
    expect(err.isOperational).toBe(false);
  });

  it('creates a git error', () => {
    const err = AppError.gitError('Merge conflict');
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe(ErrorCode.GIT_ERROR);
  });

  it('creates a proxy error', () => {
    const err = AppError.proxyError('Connection refused');
    expect(err.statusCode).toBe(502);
    expect(err.code).toBe(ErrorCode.PROXY_ERROR);
  });

  it('creates an oauth error', () => {
    const err = AppError.oauthError('Invalid grant');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe(ErrorCode.OAUTH_ERROR);
  });

  it('preserves the stack trace', () => {
    const err = AppError.notFound('not found');
    expect(err.stack).toBeDefined();
    expect(err.stack).toContain('AppError');
  });
});
