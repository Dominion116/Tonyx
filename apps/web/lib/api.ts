import type {
  BalanceResponse,
  PoolsResponse,
  QuoteRequest,
  QuoteResponse,
  ExecuteResponse,
  RunsResponse,
  RunStatusResponse,
  PolicyRequest,
  PolicyVersion,
  PolicyResponse,
} from '@tonyx/shared';

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get is402(): boolean {
    return this.status === 402;
  }
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('tonyx_jwt');
}

export function setToken(token: string): void {
  localStorage.setItem('tonyx_jwt', token);
}

export function clearToken(): void {
  localStorage.removeItem('tonyx_jwt');
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers as Record<string, string> ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText })) as { error?: string; accepts?: unknown };
    throw new ApiError(res.status, (body.error as string) ?? res.statusText);
  }
  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

export const api = {
  // Balance
  getBalance: (address: string) =>
    apiFetch<BalanceResponse>(`/api/balance/${address}`),

  // Pools (public)
  getPools: () =>
    apiFetch<PoolsResponse>('/api/pools'),

  // Policy
  getPolicy: (address: string) =>
    apiFetch<PolicyResponse>(`/api/policy/${address}`),
  savePolicy: (body: PolicyRequest) =>
    apiFetch<PolicyVersion>('/api/policy', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // Agent
  quote: (body: QuoteRequest) =>
    apiFetch<QuoteResponse>('/api/agent/quote', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  execute: (approvalToken: string, paymentReceipt: string) =>
    apiFetch<ExecuteResponse>('/api/agent/execute', {
      method: 'POST',
      headers: authHeaders({ 'X-Payment-Receipt': paymentReceipt }),
      body: JSON.stringify({ approvalToken }),
    }),
  getRunStatus: (runId: string) =>
    apiFetch<RunStatusResponse>(`/api/agent/runs/${runId}/status`),
  getRuns: (address: string, cursor?: string) =>
    apiFetch<RunsResponse>(
      `/api/agent/runs/${address}${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`,
    ),

  // Notifications
  updateNotifications: (
    address: string,
    body: { telegramUserId?: string; minGainAlertUsdt?: number; alertFrequency?: string; quietHoursStart?: number; quietHoursEnd?: number },
  ) =>
    apiFetch<{ walletAddress: string }>(`/api/notifications/${address}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
};
