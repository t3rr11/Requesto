import { ErrorCode } from './error-codes';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly isOperational: boolean;

  constructor(
    statusCode: number,
    message: string,
    code: ErrorCode,
    isOperational = true,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }

  static notFound(message = 'Resource not found'): AppError {
    return new AppError(404, message, ErrorCode.NOT_FOUND);
  }

  static badRequest(message: string): AppError {
    return new AppError(400, message, ErrorCode.VALIDATION_ERROR);
  }

  static conflict(message: string): AppError {
    return new AppError(409, message, ErrorCode.CONFLICT);
  }

  static internal(message = 'Internal server error'): AppError {
    return new AppError(500, message, ErrorCode.INTERNAL_ERROR, false);
  }

  static gitError(message: string): AppError {
    return new AppError(500, message, ErrorCode.GIT_ERROR);
  }

  static proxyError(message: string, statusCode = 502): AppError {
    return new AppError(statusCode, message, ErrorCode.PROXY_ERROR);
  }

  static oauthError(message: string, statusCode = 400): AppError {
    return new AppError(statusCode, message, ErrorCode.OAUTH_ERROR);
  }
}
