import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MiraClient } from '../client.js';
import { buildContext } from '../context.js';
import type { ContextBuilderInput, MiraContext } from '../types.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_RECOMMENDATION = {
  proceed: true,
  confidence: 0.87,
  explanation: 'The TON/USDT pool offers 12.5% APR with sufficient liquidity. Net gain after fees is $1.20.',
  suggestedAction: 'Rebalance $50 USDT into the TON/USDT pool on STON.fi.',
  followUpQuestion: undefined,
};

const MOCK_CONTEXT: MiraContext = {
  rankedPools: [
    { id: 'pool-1', name: 'TON/USDT', aprPercent: 12.5, liquidityUsdt: 1_000_000, isCrosschain: false },
  ],
  topQuote: {
    originPool: 'USDT idle',
    destinationPool: 'TON/USDT',
    routedAmountUsdt: 50,
    estimatedYieldUsdt: 1.70,
    bridgeCostUsdt: 0,
    x402FeeUsdt: 0.10,
    netGainUsdt: 1.60,
  },
  policy: {
    minNetGainUsdt: 1.00,
    cooldownSeconds: 3600,
    spendingFloorUsdt: 10,
    eligibleAssets: ['TON', 'USDT'],
    approvalMode: 'manual',
  },
  balance: { idleUsdt: 50, deployedUsdt: 200 },
  recentRuns: [],
};

const BUILDER_INPUT: ContextBuilderInput = {
  pools: [
    { id: 'p1', name: 'TON/USDT', assetPair: 'TON:USDT', aprPercent: 12.5, liquidityUsdt: 1_000_000, isCrosschain: false },
    { id: 'p2', name: 'USDT/USDC', assetPair: 'USDT:USDC', aprPercent: 5.2, liquidityUsdt: 500_000, isCrosschain: false },
    { id: 'p3', name: 'BTC/USDT', assetPair: 'BTC:USDT', aprPercent: 3.1, liquidityUsdt: 200_000, isCrosschain: true },
  ],
  topQuote: MOCK_CONTEXT.topQuote,
  policy: MOCK_CONTEXT.policy,
  balance: MOCK_CONTEXT.balance,
  recentRuns: [],
};

// ─── buildContext tests ───────────────────────────────────────────────────────

describe('buildContext', () => {
  it('ranks pools by APR descending', () => {
    const ctx = buildContext(BUILDER_INPUT);
    expect(ctx.rankedPools[0].aprPercent).toBeGreaterThanOrEqual(ctx.rankedPools[1].aprPercent);
    expect(ctx.rankedPools[1].aprPercent).toBeGreaterThanOrEqual(ctx.rankedPools[2].aprPercent);
  });

  it('caps ranked pools at 10', () => {
    const manyPools = Array.from({ length: 20 }, (_, i) => ({
      id: `p${i}`,
      name: `Pool${i}`,
      assetPair: `A${i}:B${i}`,
      aprPercent: i,
      liquidityUsdt: 100_000,
      isCrosschain: false,
    }));
    const ctx = buildContext({ ...BUILDER_INPUT, pools: manyPools });
    expect(ctx.rankedPools).toHaveLength(10);
  });

  it('caps recentRuns at 3', () => {
    const runs = Array.from({ length: 5 }, (_, i) => ({
      status: 'completed',
      originPool: 'A',
      destinationPool: 'B',
      yieldEarnedUsdt: i * 0.5,
      x402FeeUsdt: 0.10,
      completedAt: new Date().toISOString(),
    }));
    const ctx = buildContext({ ...BUILDER_INPUT, recentRuns: runs });
    expect(ctx.recentRuns).toHaveLength(3);
  });

  it('passes topQuote and policy through unchanged', () => {
    const ctx = buildContext(BUILDER_INPUT);
    expect(ctx.topQuote).toEqual(MOCK_CONTEXT.topQuote);
    expect(ctx.policy).toEqual(MOCK_CONTEXT.policy);
  });
});

// ─── MiraClient.evaluate tests ────────────────────────────────────────────────

describe('MiraClient.evaluate', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));

  it('returns a MiraRecommendation on 200', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_RECOMMENDATION,
    } as Response);

    const client = new MiraClient({ apiKey: 'test-key' });
    const result = await client.evaluate(MOCK_CONTEXT);

    expect(result.proceed).toBe(true);
    expect(result.confidence).toBe(0.87);
    expect(result.explanation).toContain('12.5%');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/evaluate'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws on non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => 'rate limited',
    } as Response);

    const client = new MiraClient({ apiKey: 'test-key' });
    await expect(client.evaluate(MOCK_CONTEXT)).rejects.toThrow('429');
  });

  it('sends Authorization header with Bearer token', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_RECOMMENDATION,
    } as Response);

    const client = new MiraClient({ apiKey: 'secret-key' });
    await client.evaluate(MOCK_CONTEXT);

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer secret-key');
  });
});

// ─── MiraClient.chat streaming tests ─────────────────────────────────────────

describe('MiraClient.chat', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));

  function makeStream(lines: string[]): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    return new ReadableStream({
      start(controller) {
        for (const line of lines) {
          controller.enqueue(encoder.encode(line + '\n'));
        }
        controller.close();
      },
    });
  }

  it('yields delta and done events from the SSE stream', async () => {
    const sseLines = [
      'data: {"type":"delta","content":"The best pool"}',
      'data: {"type":"delta","content":" right now is TON/USDT."}',
      'data: {"type":"done"}',
    ];

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      body: makeStream(sseLines),
    } as unknown as Response);

    const client = new MiraClient({ apiKey: 'test-key' });
    const events = [];
    for await (const event of client.chat([{ role: 'user', content: 'Best pool?' }], MOCK_CONTEXT)) {
      events.push(event);
    }

    expect(events).toHaveLength(3);
    expect(events[0]).toEqual({ type: 'delta', content: 'The best pool' });
    expect(events[2]).toEqual({ type: 'done' });
  });

  it('yields a proposal event when Mira returns one', async () => {
    const proposal = {
      type: 'proposal',
      data: { quoteId: 'q-1', summary: 'Rebalance into TON/USDT', estimatedYieldUsdt: 1.7, x402FeeUsdt: 0.1, netGainUsdt: 1.6 },
    };
    const sseLines = [
      `data: {"type":"delta","content":"I found a good opportunity."}`,
      `data: ${JSON.stringify(proposal)}`,
      'data: {"type":"done"}',
    ];

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      body: makeStream(sseLines),
    } as unknown as Response);

    const client = new MiraClient({ apiKey: 'test-key' });
    const events = [];
    for await (const event of client.chat([{ role: 'user', content: 'Any opportunities?' }], MOCK_CONTEXT)) {
      events.push(event);
    }

    expect(events[1]).toMatchObject({ type: 'proposal', data: expect.objectContaining({ quoteId: 'q-1' }) });
  });

  it('yields an error event when the HTTP response is not ok', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 503,
      body: null,
      text: async () => 'unavailable',
    } as unknown as Response);

    const client = new MiraClient({ apiKey: 'test-key' });
    const events = [];
    for await (const event of client.chat([], MOCK_CONTEXT)) {
      events.push(event);
    }

    expect(events[0]).toMatchObject({ type: 'error', message: expect.stringContaining('503') });
  });

  it('skips malformed SSE lines silently', async () => {
    const sseLines = [
      'data: not-valid-json',
      'data: {"type":"delta","content":"ok"}',
      'data: {"type":"done"}',
    ];

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      body: makeStream(sseLines),
    } as unknown as Response);

    const client = new MiraClient({ apiKey: 'test-key' });
    const events = [];
    for await (const event of client.chat([], MOCK_CONTEXT)) {
      events.push(event);
    }

    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ type: 'delta', content: 'ok' });
  });
});
