import { z } from 'zod';

export const PoolSchema = z.object({
  id: z.string(),
  name: z.string(),
  assetPair: z.string(),
  aprPercent: z.number(),
  liquidityUsdt: z.number(),
  isCrosschain: z.boolean(),
  estimatedBridgeCostUsdt: z.number().optional(),
});
export type Pool = z.infer<typeof PoolSchema>;

export const PoolsResponseSchema = z.object({
  pools: z.array(PoolSchema),
  cachedAt: z.string().datetime(),
});
export type PoolsResponse = z.infer<typeof PoolsResponseSchema>;
