import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from './app-error';
import { ErrorCode } from './error-codes';

/**
 * Register a global error handler on the Fastify instance.
 *
 * Error precedence:
 *  1. ZodError  → 400 with field-level details
 *  2. AppError  → mapped statusCode + code
 *  3. Unknown   → 500
 *
 * Always includes `error: string` so the frontend's existing error handling
 * continues to work. Adds `code` and (for Zod) `details` alongside.
 */
export function registerErrorHandler(server: FastifyInstance): void {
  server.setErrorHandler(
    function (
      error: Error,
      _request: FastifyRequest,
      reply: FastifyReply,
    ) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          error: 'Validation error',
          code: ErrorCode.VALIDATION_ERROR,
          details: error.flatten(),
        });
      }

      if (error instanceof AppError) {
        if (!error.isOperational) {
          server.log.error(error, 'Non-operational AppError');
        }
        return reply.code(error.statusCode).send({
          error: error.message,
          code: error.code,
        });
      }

      // Fastify adds a `statusCode` property to validation errors it generates
      // internally (e.g. JSON parse failures). Surface those as 400 too.
      const fastifyError = error as Error & { statusCode?: number };
      if (fastifyError.statusCode && fastifyError.statusCode < 500) {
        return reply.code(fastifyError.statusCode).send({
          error: error.message,
          code: ErrorCode.VALIDATION_ERROR,
        });
      }

      server.log.error(error, 'Unhandled error');
      return reply.code(500).send({
        error: 'Internal server error',
        code: ErrorCode.INTERNAL_ERROR,
      });
    },
  );
}
