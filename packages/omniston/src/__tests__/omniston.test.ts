import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- shared mock data -------------------------------------------------------

const MOCK_QUOTE = {
  rfqId: 'rfq-1',
  quoteId: 'q-1',
  resolverName: 'TestResolver',
  inputUnits: '1000000000',
  outputUnits: '2500000',
  settlementData: { $case: 'swap', value: { routes: [], minOutputAmount: '2400000', recommendedMinOutputAmount: '2450000', recommendedSlippagePips: 50 } },
  inputAsset: { chain: { $case: 'ton', value: { kind: { $case: 'native', value: {} } } } },
  outputAsset: { chain: { $case: 'ton', value: { kind: { $case: 'jetton', value: 'EQAddress123' } } } },
  integratorFeeUnits: '0',
  protocolFeeUnits: '25000',
  quoteTimestamp: Date.now() / 1000,
  resolverId: 'resolver-1',
};

const MOCK_TRANSACTION = {
  messages: [
    { address: 'EQPool123', amount: '1000000000', payload: 'base64payload==' },
  ],
};

const MOCK_POOLS_API = {
  pool_list: [
    {
      address: 'EQPool1',
      token0_address: 'EQTON',
      token1_address: 'EQUsdt',
      token0_symbol: 'TON',
      token1_symbol: 'USDT',
      apy_1d: '12.5',
      reserve0_usd: '500000',
      reserve1_usd: '500000',
    },
    {
      address: 'EQPool2',
      token0_address: 'EQUsdt',
      token1_address: 'EQUsdc',
      token0_symbol: 'USDT',
      token1_symbol: 'USDC',
      apy_1d: null,
      reserve0_usd: '200000',
      reserve1_usd: null,
    },
  ],
};

// --- mock Omniston SDK ------------------------------------------------------

vi.mock('@ston-fi/omniston-sdk', () => {
  const Observable = {
    subscribe: vi.fn(),
  };

  const mockClient = {
    requestForQuote: vi.fn(() => Observable),
    tonBuildSwap: vi.fn(() => Promise.resolve(MOCK_TRANSACTION)),
  };

  return {
    Omniston: vi.fn(() => mockClient),
    AutoReconnectTransport: vi.fn(),
    WebSocketTransport: vi.fn(),
    isSwapQuote: (q: unknown) =>
      typeof q === 'object' && q !== null && 'settlementData' in q &&
      (q as Record<string, unknown>).settlementData !== null &&
      typeof (q as Record<string, unknown>).settlementData === 'object' &&
      ((q as Record<string, { $case: string }>).settlementData).$case === 'swap',
  };
});

// --- mock client module to get the mock instance ----------------------------

vi.mock('../client.js', async (importOriginal) => {
  const { Omniston, AutoReconnectTransport, WebSocketTransport } = await import('@ston-fi/omniston-sdk');
  const instance = new (Omniston as unknown as new () => unknown)() as ReturnType<typeof import('../client.js').getClient>;
  return {
    getClient: () => instance,
    resetClient: vi.fn(),
  };
});

// --- tests ------------------------------------------------------------------

describe('discoverPools', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('maps STON.fi pool list to Pool[]', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_POOLS_API,
    } as Response);

    const { discoverPools } = await import('../pools.js');
    const pools = await discoverPools();

    expect(pools).toHaveLength(2);
    expect(pools[0]).toMatchObject({
      id: 'EQPool1',
      name: 'TON/USDT',
      aprPercent: 12.5,
      liquidityUsdt: 1_000_000,
      isCrosschain: false,
    });
  });

  it('returns 0 APR when apy_1d is null', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_POOLS_API,
    } as Response);

    const { discoverPools } = await import('../pools.js');
    const pools = await discoverPools();

    expect(pools[1].aprPercent).toBe(0);
    expect(pools[1].liquidityUsdt).toBe(200_000);
  });

  it('throws when the API returns a non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    } as Response);

    const { discoverPools } = await import('../pools.js');
    await expect(discoverPools()).rejects.toThrow('503');
  });
});

describe('getQuote', () => {
  it('resolves with the first swap quote emitted by the observable', async () => {
    const { getClient } = await import('../client.js');
    const client = getClient();

    vi.mocked(client.requestForQuote).mockReturnValueOnce({
      subscribe: (observer: { next: (e: unknown) => void }) => {
        observer.next({ $case: 'ack', value: { rfqId: 'rfq-1' } });
        observer.next({ $case: 'quoteUpdated', rfqId: 'rfq-1', value: MOCK_QUOTE });
        return { unsubscribe: vi.fn() };
      },
    } as unknown as ReturnType<typeof client.requestForQuote>);

    const { getQuote } = await import('../quote.js');
    const result = await getQuote({
      inputAsset: 'native',
      outputAsset: 'EQAddress123',
      inputAmountNano: '1000000000',
      traderAddress: 'EQTrader',
    });

    expect(result.rfqId).toBe('rfq-1');
    expect(result.quoteId).toBe('q-1');
    expect(result.resolverName).toBe('TestResolver');
    expect(result.outputUnits).toBe('2500000');
  });

  it('rejects after timeoutMs when no swap quote is received', async () => {
    const { getClient } = await import('../client.js');
    const client = getClient();

    vi.mocked(client.requestForQuote).mockReturnValueOnce({
      subscribe: () => ({ unsubscribe: vi.fn() }),
    } as unknown as ReturnType<typeof client.requestForQuote>);

    const { getQuote } = await import('../quote.js');
    await expect(
      getQuote({
        inputAsset: 'native',
        outputAsset: 'EQAddress123',
        inputAmountNano: '1000000000',
        traderAddress: 'EQTrader',
        timeoutMs: 50,
      }),
    ).rejects.toThrow('timed out');
  });
});

describe('executeRoute', () => {
  it('calls tonBuildSwap and returns transaction payload', async () => {
    const { getClient } = await import('../client.js');
    const client = getClient();

    vi.mocked(client.tonBuildSwap).mockResolvedValueOnce(
      MOCK_TRANSACTION as unknown as Awaited<ReturnType<typeof client.tonBuildSwap>>,
    );

    const { executeRoute } = await import('../execute.js');
    const result = await executeRoute({
      quote: {
        rfqId: 'rfq-1',
        quoteId: 'q-1',
        resolverName: 'TestResolver',
        inputUnits: '1000000000',
        outputUnits: '2500000',
        raw: MOCK_QUOTE as unknown as import('@ston-fi/omniston-sdk').Quote,
      },
      receiveAddress: 'EQReceiver',
    });

    expect(result.transaction).toEqual(MOCK_TRANSACTION);
    expect(client.tonBuildSwap).toHaveBeenCalledOnce();
  });
});
