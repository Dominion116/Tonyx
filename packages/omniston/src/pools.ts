import type { Pool } from '@tonyx/shared';

const STON_API = 'https://api.ston.fi/v1';
const DEFI_LLAMA_API = 'https://yields.llama.fi/pools';

// Known TON mainnet token symbols keyed by contract address
const KNOWN_SYMBOLS: Record<string, string> = {
  'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c': 'TON',
  'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs': 'USDT',
  'EQBynBO23ywHy_CgarY9NK9FTz0yDsG82PtcbSTQgGoXwiuA': 'USDC',
  'EQBlqsm144Dq6SjbPI4jjZvA1hqTIP3CvHovbIfW_t-DZWDH': 'jUSDT',
  'EQB-MPwrd1G6WKNkLz_VnV6WqBDd142KMQv-g1O-8QUA3728': 'jBTC',
  'EQDmkj65Ab_m0aZaW8IpKw4kYqd5Bv5ZkE_2WDNRW7AAAAA': 'stTON',
};

// Stablecoin symbols we're interested in for cross-chain yields
const STABLECOIN_SYMBOLS = new Set(['USDT', 'USDC', 'DAI', 'USDE', 'MIM', 'FRAX', 'crvUSD']);

// Chains we support for cross-chain settlement
const SUPPORTED_CHAINS = new Set(['ethereum', 'base', 'bsc', 'polygon']);

// Coarse bridge cost estimates (USD) per chain pair, from TON to destination
const BRIDGE_COSTS: Record<string, number> = {
  ethereum: 50,
  base: 10,
  bsc: 8,
  polygon: 8,
};

function symbol(address: string): string {
  return KNOWN_SYMBOLS[address] ?? `${address.slice(0, 4)}…${address.slice(-4)}`;
}

interface StonPool {
  address: string;
  token0_address: string;
  token1_address: string;
  apy_1d: string | null;
  lp_total_supply_usd: string | null;
  deprecated?: boolean;
}

interface StonPoolsResponse {
  pool_list: StonPool[];
}

interface DefiLlamaPool {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number;
  rewardTokens?: string[];
}

export async function discoverPools(): Promise<Pool[]> {
  const res = await fetch(`${STON_API}/pools?include_unknown_tokens=false`);
  if (!res.ok) {
    throw new Error(`STON.fi pool fetch failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as StonPoolsResponse;

  return data.pool_list
    .filter((p) => !p.deprecated)
    .map((p): Pool => {
      const sym0 = symbol(p.token0_address);
      const sym1 = symbol(p.token1_address);
      return {
        id: p.address,
        name: `${sym0}/${sym1}`,
        assetPair: `${p.token0_address}:${p.token1_address}`,
        aprPercent: p.apy_1d ? parseFloat(p.apy_1d) : 0,
        liquidityUsdt: p.lp_total_supply_usd ? parseFloat(p.lp_total_supply_usd) : 0,
        isCrosschain: false,
      };
    });
}

export async function discoverCrosschainPools(): Promise<Pool[]> {
  try {
    const res = await fetch(DEFI_LLAMA_API);
    if (!res.ok) {
      console.warn(`DefiLlama pool fetch failed: ${res.status} ${res.statusText}`);
      return [];
    }

    const data = (await res.json()) as DefiLlamaPool[];

    return data
      .filter(
        (p) =>
          SUPPORTED_CHAINS.has(p.chain) &&
          p.apy > 0 &&
          p.tvlUsd > 0 &&
          STABLECOIN_SYMBOLS.has(p.symbol),
      )
      .map((p): Pool => {
        const bridgeCost = BRIDGE_COSTS[p.chain] ?? 15;
        return {
          id: p.pool,
          name: `${p.symbol} (${p.project})`,
          assetPair: `${p.symbol}-${p.chain}`,
          aprPercent: p.apy,
          liquidityUsdt: p.tvlUsd,
          isCrosschain: true,
          estimatedBridgeCostUsdt: bridgeCost,
        };
      });
  } catch (err) {
    console.warn('[pools] Cross-chain pool discovery failed:', err);
    return [];
  }
}
