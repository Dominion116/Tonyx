import { isOrderQuote, isSwapQuote } from '@ston-fi/omniston-sdk';
import { buildChainAddress } from './assets.js';
import { getClient } from './client.js';
import type { ExecuteParams, RegisterSignedOrderParams, RouteResult } from './types.js';

export async function executeRoute(params: ExecuteParams): Promise<RouteResult> {
  const { quote, receiveAddress } = params;
  const client = getClient();

  const ownerAddress = buildChainAddress(quote.traderAddress);
  const traderDstAddress = receiveAddress ? buildChainAddress(receiveAddress) : undefined;

  if (isSwapQuote(quote.raw)) {
    if (quote.inputAsset.chain !== 'ton') {
      throw new Error('Swap settlement can only be executed from a TON wallet');
    }
    const transaction = await client.tonBuildSwap({
      quoteId: quote.quoteId,
      transferSrcAddress: ownerAddress,
      traderDstAddress,
    });
    return { kind: 'tonTransaction', transaction };
  }

  if (isOrderQuote(quote.raw)) {
    if (quote.inputAsset.chain === 'ton') {
      const transaction = await client.tonBuildEscrowTransfer({
        quoteId: quote.quoteId,
        ownerSrcAddress: ownerAddress,
        traderDstAddress,
      });
      return { kind: 'tonTransaction', transaction };
    }

    const payload = await client.evmBuildOrderPayload({
      quoteId: quote.quoteId,
      ownerSrcAddress: ownerAddress,
      traderDstAddress,
    });
    return { kind: 'evmOrderPayload', payload };
  }

  throw new Error('Unsupported settlement method for this quote');
}

/** Registers a wallet-signed EVM order with the protocol so resolvers can fill it. */
export async function registerSignedOrder(params: RegisterSignedOrderParams): Promise<void> {
  const client = getClient();
  await client.orderRegisterSignedOrder({
    quoteId: params.quoteId,
    ownerSrcAddress: buildChainAddress(params.ownerAddress),
    signedOrder: params.signedOrder,
    serializedOrderDetails: params.serializedOrderDetails,
  });
}
