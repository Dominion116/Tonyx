import type { EvmOrderPayloadResponse, Quote, SignedOrder, TonTransaction } from '@ston-fi/omniston-sdk';
import type { Pool } from '@tonyx/shared';

export type { Pool };

/** Chains the Omniston protocol can settle trades across. */
export type ChainId = 'ton' | 'arbitrum' | 'avalanche' | 'base' | 'bnb' | 'ethereum' | 'polygon';

/**
 * Chain-tagged asset reference accepted by the wrapper.
 *
 * TON assets are identified by jetton contract address (or `'native'` for the
 * TON coin); EVM assets by ERC-20 contract address (or `'native'` for the
 * chain's gas token).
 */
export type AssetRef =
  | { chain: 'ton'; kind: 'native' }
  | { chain: 'ton'; kind: 'jetton'; address: string }
  | { chain: Exclude<ChainId, 'ton'>; kind: 'native' }
  | { chain: Exclude<ChainId, 'ton'>; kind: 'erc20'; address: string };

/** Chain-tagged wallet or contract address. */
export interface AddressRef {
  chain: ChainId;
  address: string;
}

/** Settlement-method preferences to attach to a quote request. */
export type SettlementPreference =
  | { method: 'swap'; maxSlippagePips?: number }
  | { method: 'order' };

export interface QuoteParams {
  /** Blockchain-specific address of the asset being sold. */
  inputAsset: AssetRef;
  /** Blockchain-specific address of the asset being bought. */
  outputAsset: AssetRef;
  /** Amount of input asset to swap, in its smallest on-chain unit (nano for TON, wei for EVM, etc). */
  inputAmountUnits: string;
  /** Address of the wallet that will own and sign the trade. */
  traderAddress: AddressRef;
  /** Settlement methods to request, in priority order. Defaults to a same-chain swap. */
  settlement?: SettlementPreference[];
  /** How long to wait for a quote before timing out, ms (default 15000) */
  timeoutMs?: number;
}

export interface OmnistonQuote {
  rfqId: string;
  quoteId: string;
  resolverName: string;
  inputAsset: AssetRef;
  outputAsset: AssetRef;
  inputUnits: string;
  outputUnits: string;
  /** Settlement method this quote was generated for — determines how `executeRoute` builds the trade. */
  settlementMethod: 'swap' | 'order';
  /** Wallet that requested the quote, carried through to `executeRoute` / track calls. */
  traderAddress: AddressRef;
  /** Raw SDK quote, e.g. for inspecting routes/fees or passing to `matchQuoteByType`. */
  raw: Quote;
}

export interface ExecuteParams {
  quote: OmnistonQuote;
  /** Address on the destination chain that should receive the output asset (defaults to the quote's trader address). */
  receiveAddress?: AddressRef;
}

/** An unsigned trade payload ready to be signed by the trader's wallet. */
export type RouteResult =
  /** TON transaction — sign and broadcast via TonConnect. */
  | { kind: 'tonTransaction'; transaction: TonTransaction }
  /** EVM order payload — sign with `eth_signTypedData`, then hand to `registerSignedOrder`. */
  | { kind: 'evmOrderPayload'; payload: EvmOrderPayloadResponse };

export interface RegisterSignedOrderParams {
  quoteId: string;
  /** Address on the source chain that signed the order (must match the quote's trader). */
  ownerAddress: AddressRef;
  signedOrder: SignedOrder;
  serializedOrderDetails?: Uint8Array;
}

export interface TrackSwapParams {
  quoteId: string;
  traderAddress: AddressRef;
  /** Hash (or serialized body) identifying the outgoing transfer transaction. */
  outgoingTxQuery: string;
}

export interface TrackOrderParams {
  quoteId: string;
  traderAddress: AddressRef;
}

export interface DiscloseHtlcSecretParams {
  quoteId: string;
  /** Index of the execution/chunk this secret unlocks (0 for single-fill trades). */
  executionIndex: number;
  secret: Uint8Array;
}
