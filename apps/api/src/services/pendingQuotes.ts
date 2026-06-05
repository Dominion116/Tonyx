import type { OmnistonQuote } from '@tonyx/omniston';

const QUOTE_TTL_MS = 10 * 60 * 1_000; // 10 minutes

export interface PendingQuote {
  walletAddress: string;
  omnistonQuote: OmnistonQuote;
  originPool: string;
  destinationPool: string;
  routedAmountUsdt: number;
  estimatedYieldUsdt: number;
  x402FeeUsdt: number;
  netGainUsdt: number;
  expiresAt: number;
}

const store = new Map<string, PendingQuote>();

export function savePendingQuote(token: string, quote: PendingQuote): void {
  store.set(token, quote);
  // Auto-evict after TTL
  setTimeout(() => store.delete(token), QUOTE_TTL_MS);
}

export function consumePendingQuote(token: string): PendingQuote | undefined {
  const q = store.get(token);
  if (!q) return undefined;
  if (Date.now() > q.expiresAt) {
    store.delete(token);
    return undefined;
  }
  store.delete(token); // single-use
  return q;
}
