import { z } from 'zod';

export const ErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  details: z.array(z.object({ field: z.string(), message: z.string() })).optional(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
