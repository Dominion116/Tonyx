import type { MiraRecommendation, Pool, SseEvent } from '@tonyx/shared';

export type { MiraRecommendation };

// ─── Context shapes ──────────────────────────────────────────────────────────

export interface PoolSnapshot {
  id: string;
  name: string;
  aprPercent: number;
  liquidityUsdt: number;
  isCrosschain: boolean;
}

export interface QuoteSnapshot {
  originPool: string;
  destinationPool: string;
  routedAmountUsdt: number;
  estimatedYieldUsdt: number;
  bridgeCostUsdt: number;
  x402FeeUsdt: number;
  netGainUsdt: number;
}

export interface PolicySnapshot {
  minNetGainUsdt: number;
  cooldownSeconds: number;
  spendingFloorUsdt: number;
  eligibleAssets: string[];
  approvalMode: 'auto' | 'manual';
}

export interface BalanceSnapshot {
  idleUsdt: number;
  deployedUsdt: number;
}

export interface RunSnapshot {
  status: string;
  originPool: string;
  destinationPool: string;
  yieldEarnedUsdt: number;
  x402FeeUsdt: number;
  completedAt: string | null;
}

/** Full context object sent to Mira on every evaluation or chat call */
export interface MiraContext {
  rankedPools: PoolSnapshot[];
  topQuote: QuoteSnapshot | null;
  policy: PolicySnapshot;
  balance: BalanceSnapshot;
  recentRuns: RunSnapshot[];
}

// ─── Chat types ───────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Async generator that yields SSE events as they arrive from Mira.
 * Yields SseEvent objects; the caller is responsible for piping them
 * to the HTTP response.
 */
export type ChatStream = AsyncGenerator<SseEvent, void, unknown>;

// ─── Client config ────────────────────────────────────────────────────────────

export interface MiraClientConfig {
  apiKey: string;
  baseUrl?: string;
}

// ─── Context builder inputs ───────────────────────────────────────────────────

export interface ContextBuilderInput {
  pools: Pool[];
  topQuote: QuoteSnapshot | null;
  policy: PolicySnapshot;
  balance: BalanceSnapshot;
  recentRuns: RunSnapshot[];
}
