import { z } from 'zod';
import { RunStatusSchema } from '../models/runs.js';
import { MiraRecommendationSchema } from '../models/mira.js';

export const QuoteRequestSchema = z.object({
  walletAddress: z.string().min(1).max(128).trim(),
  idleAmountUsdt: z.number().positive(),
  destinationPoolId: z.string().min(1).optional(),
});
export type QuoteRequest = z.infer<typeof QuoteRequestSchema>;

export const QuoteResponseSchema = z.object({
  approvalToken: z.string().optional(),
  originPool: z.string(),
  destinationPool: z.string(),
  destinationAprPercent: z.number(),
  routedAmountUsdt: z.number(),
  estimatedYieldUsdt: z.number(),
  routeCostUsdt: z.number().nonnegative().optional(),
  mira: MiraRecommendationSchema,
  // ── Cross-chain route details (omitted for same-chain TON swaps) ─────────────
  isCrosschain: z.boolean().optional(),
  destinationChain: z.string().optional(),
  bridgeCostUsdt: z.number().nonnegative().optional(),
});
export type QuoteResponse = z.infer<typeof QuoteResponseSchema>;

export const ExecuteRequestSchema = z.object({
  approvalToken: z.string().min(1),
});
export type ExecuteRequest = z.infer<typeof ExecuteRequestSchema>;

export const ExecuteResponseSchema = z.object({
  runId: z.string(),
  status: RunStatusSchema,
});
export type ExecuteResponse = z.infer<typeof ExecuteResponseSchema>;

export const RunSummarySchema = z.object({
  id: z.string(),
  status: RunStatusSchema,
  originPool: z.string(),
  destinationPool: z.string(),
  routedAmountUsdt: z.number(),
  yieldEarnedUsdt: z.number(),
  txHash: z.string().optional(),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  isCrosschain: z.boolean().optional(),
  destinationChain: z.string().optional(),
  bridgeCostUsdt: z.number().nonnegative().optional(),
});
export type RunSummary = z.infer<typeof RunSummarySchema>;

export const RunsResponseSchema = z.object({
  runs: z.array(RunSummarySchema),
  nextCursor: z.string().optional(),
  hasMore: z.boolean(),
});
export type RunsResponse = z.infer<typeof RunsResponseSchema>;

export const RunStatusResponseSchema = z.object({
  id: z.string(),
  status: RunStatusSchema,
  txHash: z.string().optional(),
  isCrosschain: z.boolean().optional(),
  destinationChain: z.string().optional(),
  /** Human-readable settlement phase for cross-chain orders (e.g. 'Escrow locked'). */
  settlementPhase: z.string().optional(),
});
export type RunStatusResponse = z.infer<typeof RunStatusResponseSchema>;
