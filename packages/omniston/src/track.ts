import { buildChainAddress } from './assets.js';
import { getClient } from './client.js';
import type { DiscloseHtlcSecretParams, TrackOrderParams, TrackSwapParams } from './types.js';

/** Streams settlement progress for a same-chain / TON swap. */
export function trackSwap(params: TrackSwapParams) {
  const client = getClient();
  return client.swapTrack({
    quoteId: params.quoteId,
    traderAddress: buildChainAddress(params.traderAddress),
    outgoingTxQuery: params.outgoingTxQuery,
  });
}

/** Streams settlement progress for a cross-chain order (escrow / HTLC). */
export function trackOrder(params: TrackOrderParams) {
  const client = getClient();
  return client.orderTrack({
    quoteId: params.quoteId,
    traderAddress: buildChainAddress(params.traderAddress),
  });
}

/** Discloses the HTLC secret that unlocks the destination-chain position for one execution. */
export async function discloseHtlcSecret(params: DiscloseHtlcSecretParams): Promise<void> {
  const client = getClient();
  await client.orderDiscloseHtlcSecret({
    quoteId: params.quoteId,
    executionIndex: params.executionIndex,
    secret: params.secret,
  });
}
