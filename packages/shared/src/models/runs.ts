import { z } from 'zod';

export const RunStatusSchema = z.enum([
  'pending',
  'executing',
  'completed',
  'failed',
  'skipped',
]);
export type RunStatus = z.infer<typeof RunStatusSchema>;

export const RunSchema = z.object({
  walletAddress: z.string().min(1).max(128).trim(),
  status: RunStatusSchema,
  originPool: z.string().trim(),
  destinationPool: z.string().trim(),
  routedAmountUsdt: z.number().nonnegative(),
  yieldEarnedUsdt: z.number().nonnegative(),
  x402FeeUsdt: z.number().nonnegative(),
  txHash: z.string().optional(),
  approvalToken: z.string().min(1),
  createdAt: z.date(),
  completedAt: z.date().optional(),
});

export type Run = z.infer<typeof RunSchema>;
