import type { Pool } from '@tonyx/shared';

const STON_API = 'https://api.ston.fi/v1';

interface StonPool {
  address: string;
  token0_address: string;
  token1_address: string;
  token0_symbol: string;
  token1_symbol: string;
  apy_1d: string | null;
  reserve0_usd: string | null;
  reserve1_usd: string | null;
}

interface StonPoolsResponse {
  pool_list: StonPool[];
}

function parseUsdt(value: string | null): number {
  if (!value) return 0;
  return parseFloat(value) || 0;
}

function totalLiquidity(pool: StonPool): number {
  return parseUsdt(pool.reserve0_usd) + parseUsdt(pool.reserve1_usd);
}

export async function discoverPools(): Promise<Pool[]> {
  const res = await fetch(`${STON_API}/pools?include_unknown_tokens=false`);
  if (!res.ok) {
    throw new Error(`STON.fi pool fetch failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as StonPoolsResponse;

  return data.pool_list.map((p): Pool => ({
    id: p.address,
    name: `${p.token0_symbol}/${p.token1_symbol}`,
    assetPair: `${p.token0_address}:${p.token1_address}`,
    aprPercent: parseUsdt(p.apy_1d),
    liquidityUsdt: totalLiquidity(p),
    isCrosschain: false,
  }));
}
