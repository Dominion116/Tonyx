import type { MiraRecommendation } from '@tonyx/shared';

export interface AdvisorInput {
  originPool: string;
  destinationPool: string;
  aprPercent: number;
  routedAmountUsdt: number;
  estimatedYieldUsdt: number;
  minNetGainUsdt: number;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

/**
 * Deterministic, transparent recommendation engine. Tonyx never defers the
 * proceed/hold call to an opaque model — every number here traces back to the
 * policy thresholds and the computed route economics, so the explanation is
 * always reproducible from the inputs.
 */
export function evaluateRebalance(input: AdvisorInput): MiraRecommendation {
  const {
    originPool,
    destinationPool,
    aprPercent,
    routedAmountUsdt,
    estimatedYieldUsdt,
    minNetGainUsdt,
  } = input;

  const proceed = estimatedYieldUsdt >= minNetGainUsdt;

  // Confidence scales with how comfortably the estimated yield clears the
  // policy floor, with a small bump for larger routed amounts (more signal, less noise).
  const margin =
    minNetGainUsdt > 0
      ? (estimatedYieldUsdt - minNetGainUsdt) / minNetGainUsdt
      : estimatedYieldUsdt;
  const sizeBonus = Math.min(routedAmountUsdt / 10_000, 0.15);
  const confidence = Math.round(clamp(0.55 + margin * 0.15 + sizeBonus, 0.4, 0.95) * 100) / 100;

  const explanation = proceed
    ? `Routing $${routedAmountUsdt.toFixed(2)} from ${originPool} into ${destinationPool} at ${aprPercent.toFixed(2)}% APR clears your $${minNetGainUsdt.toFixed(2)} minimum gain: estimated yield $${estimatedYieldUsdt.toFixed(4)}/day.`
    : `Moving into ${destinationPool} at ${aprPercent.toFixed(2)}% APR only yields $${estimatedYieldUsdt.toFixed(4)}/day — below your $${minNetGainUsdt.toFixed(2)} minimum. Holding for now; I'll resurface this if the spread widens.`;

  return {
    proceed,
    confidence,
    explanation,
    suggestedAction: proceed
      ? `Rebalance $${routedAmountUsdt.toFixed(2)} into ${destinationPool}`
      : `Hold — wait for a wider spread on ${destinationPool}`,
  };
}
