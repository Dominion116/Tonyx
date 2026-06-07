/**
 * Builds a Telegram deep link that hands a rebalance proposal to @mira for a
 * second opinion. Mira has no programmatic API, so the bridge is a pre-filled
 * message: `https://t.me/mira?text=<encoded summary>`. The `[TONYX PROPOSAL]`
 * tag at the top is the trigger a custom Mira skill matches on; everything
 * below it is plain language so the link is useful even without the skill.
 */

const MIRA_USERNAME = 'mira';
export const TONYX_PROPOSAL_TAG = '[TONYX PROPOSAL]';

/**
 * One-tap install link for the "Tonyx Rebalance Reviewer" custom skill.
 * Installing it lets @mira recognize the TONYX_PROPOSAL_TAG and respond as a
 * second-opinion reviewer instead of a generic assistant. See MIRA_SKILL.md.
 */
export const MIRA_SKILL_INSTALL_URL = 'https://t.me/mira?start=skill_vBuSTLd7';

export interface AskMiraProposal {
  originPool: string;
  destinationPool: string;
  routedAmountUsdt: number;
  aprPercent?: number;
  estimatedYieldUsdt: number;
  confidence: number;
  explanation: string;
}

export function buildAskMiraMessage(proposal: AskMiraProposal): string {
  const {
    originPool,
    destinationPool,
    routedAmountUsdt,
    aprPercent,
    estimatedYieldUsdt,
    confidence,
    explanation,
  } = proposal;

  return [
    TONYX_PROPOSAL_TAG,
    `Route: ${originPool} -> ${destinationPool}`,
    `Amount: $${routedAmountUsdt.toFixed(2)}`,
    ...(aprPercent !== undefined ? [`APR: ${aprPercent.toFixed(2)}%`] : []),
    `Est. yield: $${estimatedYieldUsdt.toFixed(4)}/day`,
    `Tonyx confidence: ${Math.round(confidence * 100)}%`,
    `Tonyx says: "${explanation}"`,
    '',
    'Mira, what is your take on this route — worth executing, or is there a smarter move here?',
  ].join('\n');
}

export function buildAskMiraDeepLink(proposal: AskMiraProposal): string {
  return `https://t.me/${MIRA_USERNAME}?text=${encodeURIComponent(buildAskMiraMessage(proposal))}`;
}
