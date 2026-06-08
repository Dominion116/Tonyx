import type { BalanceResponse, AssetBalance, LpPositionSchema } from '@tonyx/shared';
import { z } from 'zod';
import { env } from '../env.js';
import { TtlCache } from './cache.js';

const BASE = 'https://tonapi.io/v2';
const balanceCache = new TtlCache<BalanceResponse>(30_000);

function headers(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (env.tonapiKey) h['Authorization'] = `Bearer ${env.tonapiKey}`;
  return h;
}

const AccountSchema = z.object({
  balance: z.string(),
  status: z.string().optional(),
});

const JettonBalanceSchema = z.object({
  balance: z.string(),
  price: z.object({ prices: z.record(z.number()).optional() }).optional(),
  jetton: z.object({
    symbol: z.string(),
    decimals: z.number(),
    address: z.string(),
  }),
});

const JettonsResponseSchema = z.object({
  balances: z.array(JettonBalanceSchema),
});

const RatesResponseSchema = z.object({
  rates: z.record(z.object({ prices: z.record(z.number()).optional() })).optional(),
});

function nanosToTon(nano: string): number {
  return parseInt(nano, 10) / 1e9;
}

function toUsd(amount: number, usdPrice: number): number {
  return parseFloat((amount * usdPrice).toFixed(6));
}

export async function fetchBalance(walletAddress: string): Promise<BalanceResponse> {
  const cached = balanceCache.get(walletAddress);
  if (cached) return cached;

  if (!env.tonapiKey) {
    // Return zeroed response in dev when no API key is configured
    const empty: BalanceResponse = {
      walletAddress,
      assets: [],
      lpPositions: [],
      idleUsdt: 0,
      deployedUsdt: 0,
      lifetimeYieldUsdt: 0,
    };
    balanceCache.set(walletAddress, empty);
    return empty;
  }

  const [accountRes, jettonsRes, ratesRes] = await Promise.all([
    fetch(`${BASE}/accounts/${walletAddress}`, { headers: headers() }),
    fetch(`${BASE}/accounts/${walletAddress}/jettons?currencies=usd`, { headers: headers() }),
    fetch(`${BASE}/rates?tokens=ton&currencies=usd`, { headers: headers() }),
  ]);

  if (!accountRes.ok) {
    throw new Error(`TonAPI account fetch failed: ${accountRes.status}`);
  }

  const account = AccountSchema.parse(await accountRes.json());
  const tonAmount = nanosToTon(account.balance);

  let tonUsdPrice = 0;
  if (ratesRes.ok) {
    const ratesData = RatesResponseSchema.parse(await ratesRes.json());
    tonUsdPrice = ratesData.rates?.['TON']?.prices?.['USD'] ?? 0;
  }

  const assets: AssetBalance[] = [
    { asset: 'TON', amount: tonAmount, usdValue: toUsd(tonAmount, tonUsdPrice) },
  ];

  if (jettonsRes.ok) {
    const jettonsData = JettonsResponseSchema.parse(await jettonsRes.json());

    for (const j of jettonsData.balances) {
      const decimals = j.jetton.decimals ?? 9;
      const amount = parseInt(j.balance, 10) / 10 ** decimals;
      const usdPrice = j.price?.prices?.['usd'] ?? 0;
      const usdValue = toUsd(amount, usdPrice);
      assets.push({ asset: j.jetton.symbol, amount, usdValue });
    }
  }

  const idleUsdt = assets.reduce((sum, a) => sum + a.usdValue, 0);

  const result: BalanceResponse = {
    walletAddress,
    assets,
    lpPositions: [],
    idleUsdt: parseFloat(idleUsdt.toFixed(2)),
    deployedUsdt: 0,
    lifetimeYieldUsdt: 0,
  };

  balanceCache.set(walletAddress, result);
  return result;
}

// Allow the run completion handler to bust the balance cache
export function invalidateBalanceCache(walletAddress: string): void {
  balanceCache.delete(walletAddress);
}
