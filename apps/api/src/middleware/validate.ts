import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';
import type { ErrorResponse } from '@tonyx/shared';

type Target = 'body' | 'query' | 'params';

/**
 * Returns a middleware that validates req[target] against the given Zod schema.
 * On failure it sends a 400 with structured field errors.
 * On success it replaces req[target] with the parsed (coerced) value and calls next().
 */
export function validate(schema: ZodSchema, target: Target = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const details = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      const body: ErrorResponse = { error: 'Validation failed', code: 'VALIDATION_ERROR', details };
      res.status(400).json(body);
      return;
    }

    // Replace with the parsed value so downstream handlers get coerced types
    (req as unknown as Record<string, unknown>)[target] = result.data;
    next();
  };
}
