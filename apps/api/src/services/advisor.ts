import type { MiraRecommendation } from '@tonyx/shared';

export interface AdvisorInput {
  originPool: string;
  destinationPool: string;
  aprPercent: number;
  routedAmountUsdt: number;
  estimatedYieldUsdt: number;
  minNetGainUsdt: number;
  /** Bridge cost for cross-chain routes (USD). Optional; indicates cross-chain if provided. */
  estimatedBridgeCostUsdt?: number;
  /** Destination chain name for cross-chain routes (e.g., 'ethereum', 'base'). */
  destinationChain?: string;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

/**
 * Deterministic, transparent recommendation engine. Tonyx never defers the
 * proceed/hold call to an opaque model — every number here traces back to the
 * policy thresholds and the computed route economics, so the explanation is
 * always reproducible from the inputs.
 *
 * For cross-chain routes, the net gain floor is raised to account for HTLC
 * settlement risk and time-value loss during the bridge window (~5 min).
 */
export function evaluateRebalance(input: AdvisorInput): MiraRecommendation {
  const {
    originPool,
    destinationPool,
    aprPercent,
    routedAmountUsdt,
    estimatedYieldUsdt,
    minNetGainUsdt,
    estimatedBridgeCostUsdt,
    destinationChain,
  } = input;

  const isCrosschain = estimatedBridgeCostUsdt !== undefined && estimatedBridgeCostUsdt > 0;

  // For cross-chain routes, raise the floor by 150% to account for HTLC settlement risk
  // and time-value loss during the bridge window (~5 min of yield forgone).
  const adjustedFloor = isCrosschain ? minNetGainUsdt * 2.5 : minNetGainUsdt;
  const proceed = estimatedYieldUsdt >= adjustedFloor;

  // Confidence scales with how comfortably the estimated yield clears the
  // policy floor, with a small bump for larger routed amounts (more signal, less noise).
  // Cross-chain routes get a penalty for settlement risk and HTLC counterparty exposure.
  const margin = adjustedFloor > 0 ? (estimatedYieldUsdt - adjustedFloor) / adjustedFloor : estimatedYieldUsdt;
  const sizeBonus = Math.min(routedAmountUsdt / 10_000, 0.15);
  const crosschainPenalty = isCrosschain ? 0.15 : 0;
  const confidence = Math.round(
    clamp(0.55 + margin * 0.15 + sizeBonus - crosschainPenalty, 0.3, 0.9) * 100,
  ) / 100;

  let explanation: string;
  if (proceed) {
    if (isCrosschain) {
      const netAfterBridge = estimatedYieldUsdt - (estimatedBridgeCostUsdt ?? 0);
      explanation = `Routing $${routedAmountUsdt.toFixed(2)} to ${destinationChain ?? 'destination'} at ${aprPercent.toFixed(2)}% APR. Bridge cost: $${estimatedBridgeCostUsdt?.toFixed(2)}. Net yield after bridge: $${netAfterBridge.toFixed(4)}/day, clearing your $${adjustedFloor.toFixed(2)} threshold (cross-chain premium applied).`;
    } else {
      explanation = `Routing $${routedAmountUsdt.toFixed(2)} from ${originPool} into ${destinationPool} at ${aprPercent.toFixed(2)}% APR clears your $${minNetGainUsdt.toFixed(2)} minimum gain: estimated yield $${estimatedYieldUsdt.toFixed(4)}/day.`;
    }
  } else {
    if (isCrosschain) {
      const netAfterBridge = estimatedYieldUsdt - (estimatedBridgeCostUsdt ?? 0);
      explanation = `Cross-chain to ${destinationChain ?? 'destination'} at ${aprPercent.toFixed(2)}% APR yields $${estimatedYieldUsdt.toFixed(4)}/day, but after $${estimatedBridgeCostUsdt?.toFixed(2)} bridge cost and settlement risk premium, it only nets $${netAfterBridge.toFixed(4)}/day — below your $${adjustedFloor.toFixed(2)} threshold. Holding for now.`;
    } else {
      explanation = `Moving into ${destinationPool} at ${aprPercent.toFixed(2)}% APR only yields $${estimatedYieldUsdt.toFixed(4)}/day — below your $${minNetGainUsdt.toFixed(2)} minimum. Holding for now; I'll resurface this if the spread widens.`;
    }
  }

  return {
    proceed,
    confidence,
    explanation,
    suggestedAction: proceed
      ? `Rebalance $${routedAmountUsdt.toFixed(2)} to ${destinationChain ? `${destinationChain} (${destinationPool})` : destinationPool}`
      : `Hold — wait for a wider spread on ${destinationChain ? `${destinationChain} (${destinationPool})` : destinationPool}`,
  };
}
