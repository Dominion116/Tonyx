import { cookies } from 'next/headers';
import type {
  BalanceResponse,
  PoolsResponse,
  PolicyResponse,
  RunsResponse,
} from '@tonyx/shared';

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get('tonyx_session')?.value ?? null;
}

/** Decode the wallet address from the JWT sub claim without verifying the signature. */
export async function getServerWalletAddress(): Promise<string | null> {
  const token = await getSessionToken();
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString()) as { sub?: string };
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

async function serverFetch<T>(path: string, requiresAuth = true): Promise<T | null> {
  try {
    const token = await getSessionToken();
    if (requiresAuth && !token) return null;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${BASE}${path}`, {
      headers,
      cache: 'no-store',
    });

    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

export const serverApi = {
  getBalance: (address: string) =>
    serverFetch<BalanceResponse>(`/api/balance/${address}`),

  getPools: () =>
    serverFetch<PoolsResponse>('/api/pools', false),

  getPolicy: (address: string) =>
    serverFetch<PolicyResponse>(`/api/policy/${address}`),

  getRuns: (address: string) =>
    serverFetch<RunsResponse>(`/api/agent/runs/${address}`),
};
