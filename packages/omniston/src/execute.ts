import { isSwapQuote } from '@ston-fi/omniston-sdk';
import { getClient } from './client.js';
import type { ExecuteParams, RouteResult } from './types.js';

function tonAddress(address: string) {
  return { chain: { $case: 'ton' as const, value: address } };
}

export async function executeRoute(params: ExecuteParams): Promise<RouteResult> {
  const { quote, receiveAddress } = params;

  if (!isSwapQuote(quote.raw)) {
    throw new Error('Only swap-settlement quotes are supported for TON execution');
  }

  const client = getClient();

  const transaction = await client.tonBuildSwap({
    quoteId: quote.quoteId,
    transferSrcAddress: tonAddress(receiveAddress),
    traderDstAddress: tonAddress(receiveAddress),
  });

  return { transaction };
}
