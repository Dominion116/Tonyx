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
  SessionResponse,
  SessionListItem,
  MessagesResponse,
  SseEvent,
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

  // Chat sessions
  createSession: (title?: string) =>
    apiFetch<SessionResponse>('/api/chat/sessions', {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),
  getSessions: (address: string) =>
    apiFetch<SessionListItem[]>(`/api/chat/sessions/${address}`),
  getMessages: (sessionId: string, before?: string) =>
    apiFetch<MessagesResponse>(
      `/api/chat/sessions/${sessionId}/messages${before ? `?before=${encodeURIComponent(before)}` : ''}`,
    ),
  deleteSession: (sessionId: string) =>
    apiFetch<void>(`/api/chat/sessions/${sessionId}`, { method: 'DELETE' }),

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

/**
 * Streams a chat message via SSE. Returns a cleanup function to abort.
 * `paymentReceipt` is a placeholder until the x402 client SDK is wired.
 */
export function streamMessage(
  sessionId: string,
  content: string,
  onEvent: (event: SseEvent) => void,
  paymentReceipt = 'dev-placeholder',
): () => void {
  const controller = new AbortController();

  (async () => {
    try {
      const token = getToken();
      const res = await fetch(`${BASE}/api/chat/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Payment-Receipt': paymentReceipt,
        },
        body: JSON.stringify({ content }),
        signal: controller.signal,
      });

      if (!res.ok) {
        onEvent({ type: 'error', message: 'Failed to send message' });
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6)) as SseEvent;
              onEvent(event);
            } catch {
              // ignore malformed lines
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      onEvent({ type: 'error', message: 'Connection lost' });
    }
  })();

  return () => controller.abort();
}
