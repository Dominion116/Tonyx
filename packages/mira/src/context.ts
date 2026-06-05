import type { ContextBuilderInput, MiraContext, PoolSnapshot } from './types.js';

const MAX_RANKED_POOLS = 10;

/**
 * Assembles pool data, policy, balance, and recent runs into the structured
 * context object Mira expects on every call.
 */
export function buildContext(input: ContextBuilderInput): MiraContext {
  const { pools, topQuote, policy, balance, recentRuns } = input;

  const rankedPools: PoolSnapshot[] = pools
    .slice()
    .sort((a, b) => b.aprPercent - a.aprPercent)
    .slice(0, MAX_RANKED_POOLS)
    .map((p) => ({
      id: p.id,
      name: p.name,
      aprPercent: p.aprPercent,
      liquidityUsdt: p.liquidityUsdt,
      isCrosschain: p.isCrosschain,
    }));

  return {
    rankedPools,
    topQuote,
    policy,
    balance,
    recentRuns: recentRuns.slice(0, 3),
  };
}
