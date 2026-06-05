import type { NextFunction, Request, Response } from 'express';
import type { ErrorResponse } from '@tonyx/shared';

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static badRequest(message: string, code?: string): ApiError {
    return new ApiError(400, message, code);
  }

  static unauthorized(message = 'Unauthorized'): ApiError {
    return new ApiError(401, message, 'UNAUTHORIZED');
  }

  static forbidden(message = 'Forbidden'): ApiError {
    return new ApiError(403, message, 'FORBIDDEN');
  }

  static notFound(message = 'Not found'): ApiError {
    return new ApiError(404, message, 'NOT_FOUND');
  }

  static internal(message = 'Internal server error'): ApiError {
    return new ApiError(500, message, 'INTERNAL_ERROR');
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  if (err instanceof ApiError) {
    const body: ErrorResponse = { error: err.message, code: err.code };
    res.status(err.statusCode).json(body);
    return;
  }

  const message = err instanceof Error ? err.message : 'Internal server error';
  console.error('[unhandled]', err);
  res.status(500).json({ error: message, code: 'INTERNAL_ERROR' } satisfies ErrorResponse);
}
