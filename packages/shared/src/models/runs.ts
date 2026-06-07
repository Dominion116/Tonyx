import { z } from 'zod';

export const RunStatusSchema = z.enum([
  'pending',
  'executing',
  'completed',
  'failed',
  'skipped',
  // Cross-chain HTLC settlement got partially filled or is taking longer than the
  // settlement window allows. Distinct from 'failed' because funds are not lost —
  // they're locked in escrow pending resolution. Same-chain swaps never hit this.
  'stuck',
]);
export type RunStatus = z.infer<typeof RunStatusSchema>;

/** How Omniston settles a route. 'swap' is same-chain/TON; 'order' is cross-chain HTLC. */
export const SettlementTypeSchema = z.enum(['swap', 'order']);
export type SettlementType = z.infer<typeof SettlementTypeSchema>;

export const RunSchema = z.object({
  walletAddress: z.string().min(1).max(128).trim(),
  status: RunStatusSchema,
  originPool: z.string().trim(),
  destinationPool: z.string().trim(),
  routedAmountUsdt: z.number().nonnegative(),
  yieldEarnedUsdt: z.number().nonnegative(),
  txHash: z.string().optional(),
  approvalToken: z.string().min(1),
  createdAt: z.date(),
  completedAt: z.date().optional(),
  // ── Cross-chain settlement metadata (absent on same-chain TON swaps) ──────────
  isCrosschain: z.boolean().optional(),
  /** Destination chain for cross-chain routes (e.g. 'ethereum', 'base'). */
  destinationChain: z.string().optional(),
  /** Coarse bridge cost estimate carried from the quote, USD. */
  bridgeCostUsdt: z.number().nonnegative().optional(),
  /** Settlement method this run was created for. */
  settlementType: SettlementTypeSchema.optional(),
});

export type Run = z.infer<typeof RunSchema>;
