import { z } from 'zod';

export const AssetBalanceSchema = z.object({
  asset: z.string(),
  amount: z.number(),
  usdValue: z.number(),
});
export type AssetBalance = z.infer<typeof AssetBalanceSchema>;

export const LpPositionSchema = z.object({
  poolId: z.string(),
  poolName: z.string(),
  depositedUsdt: z.number(),
  currentAprPercent: z.number(),
});
export type LpPosition = z.infer<typeof LpPositionSchema>;

export const BalanceResponseSchema = z.object({
  walletAddress: z.string(),
  assets: z.array(AssetBalanceSchema),
  lpPositions: z.array(LpPositionSchema),
  idleUsdt: z.number(),
  deployedUsdt: z.number(),
  lifetimeYieldUsdt: z.number(),
});
export type BalanceResponse = z.infer<typeof BalanceResponseSchema>;
