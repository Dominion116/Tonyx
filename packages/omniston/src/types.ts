import type { Quote, TonTransaction } from '@ston-fi/omniston-sdk';
import type { Pool } from '@tonyx/shared';

export type { Pool };

export interface QuoteParams {
  /** Jetton contract address of input asset, or 'native' for TON */
  inputAsset: string | 'native';
  /** Jetton contract address of output asset, or 'native' for TON */
  outputAsset: string | 'native';
  /** Amount to swap in nanotons (or smallest unit of the input asset) */
  inputAmountNano: string;
  /** TON wallet address of the trader */
  traderAddress: string;
  /** Max slippage in basis points (default 50 = 0.5%) */
  maxSlippagePips?: number;
  /** How long to wait for a quote before timing out, ms (default 15000) */
  timeoutMs?: number;
}

export interface OmnistonQuote {
  rfqId: string;
  quoteId: string;
  resolverName: string;
  inputUnits: string;
  outputUnits: string;
  /** Raw SDK quote kept for passing into executeRoute */
  raw: Quote;
}

export interface ExecuteParams {
  quote: OmnistonQuote;
  /** TON address that will receive the output asset */
  receiveAddress: string;
}

export interface RouteResult {
  /** TON transaction payload — sign and broadcast via TonConnect */
  transaction: TonTransaction;
}
