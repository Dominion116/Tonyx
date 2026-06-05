import type { Pool } from '@tonyx/shared';

const STON_API = 'https://api.ston.fi/v1';

// Known TON mainnet token symbols keyed by contract address
const KNOWN_SYMBOLS: Record<string, string> = {
  'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c': 'TON',
  'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs': 'USDT',
  'EQBynBO23ywHy_CgarY9NK9FTz0yDsG82PtcbSTQgGoXwiuA': 'USDC',
  'EQBlqsm144Dq6SjbPI4jjZvA1hqTIP3CvHovbIfW_t-DZWDH': 'jUSDT',
  'EQB-MPwrd1G6WKNkLz_VnV6WqBDd142KMQv-g1O-8QUA3728': 'jBTC',
  'EQDmkj65Ab_m0aZaW8IpKw4kYqd5Bv5ZkE_2WDNRW7AAAAA': 'stTON',
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
