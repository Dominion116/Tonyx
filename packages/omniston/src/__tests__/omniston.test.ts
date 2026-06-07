import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OmnistonQuote } from '../types.js';

// --- shared mock data -------------------------------------------------------

const MOCK_SWAP_QUOTE = {
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

const MOCK_TON_ORDER_QUOTE = {
  ...MOCK_SWAP_QUOTE,
  quoteId: 'q-2',
  settlementData: { $case: 'order', value: { srcProtocolContractAddress: { chain: { $case: 'ton', value: 'EQEscrow' } }, resolverSendsUnits: '2500000', tradeStartDeadline: 0, exclusivityTimeout: 0, integratorFeePips: 0, protocolFeePips: 0 } },
  inputAsset: { chain: { $case: 'ton', value: { kind: { $case: 'jetton', value: 'EQUsdtJetton' } } } },
  outputAsset: { chain: { $case: 'ethereum', value: { kind: { $case: 'erc20', value: '0xUSDC' } } } },
};

const MOCK_EVM_ORDER_QUOTE = {
  ...MOCK_SWAP_QUOTE,
  quoteId: 'q-3',
  settlementData: { $case: 'order', value: { srcProtocolContractAddress: { chain: { $case: 'ethereum', value: '0xProtocol' } }, resolverSendsUnits: '2500000', tradeStartDeadline: 0, exclusivityTimeout: 0, integratorFeePips: 0, protocolFeePips: 0 } },
  inputAsset: { chain: { $case: 'ethereum', value: { kind: { $case: 'erc20', value: '0xUSDC' } } } },
  outputAsset: { chain: { $case: 'ton', value: { kind: { $case: 'jetton', value: 'EQUsdtJetton' } } } },
};

const MOCK_TRANSACTION = {
  messages: [
    { targetAddress: 'EQPool123', sendAmount: '1000000000', payload: 'base64payload==' },
  ],
};

const MOCK_EVM_ORDER_PAYLOAD = {
  typedData: '{"types":{}}',
  orderExtension: new Uint8Array([1, 2, 3]),
};

const USDT_ADDRESS = 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs';
const USDC_ADDRESS = 'EQBynBO23ywHy_CgarY9NK9FTz0yDsG82PtcbSTQgGoXwiuA';
const TON_ADDRESS = 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c';

const MOCK_POOLS_API = {
  pool_list: [
    // Supported: both legs are USDC/USDT.
    {
      address: 'EQPool1',
      token0_address: USDT_ADDRESS,
      token1_address: USDC_ADDRESS,
      apy_1d: '12.5',
      lp_total_supply_usd: '1000000',
    },
    // Unsupported: TON is not a stable — must be filtered out.
    {
      address: 'EQPool2',
      token0_address: TON_ADDRESS,
      token1_address: USDT_ADDRESS,
      apy_1d: '8.0',
      lp_total_supply_usd: '500000',
    },
    // Supported, null apy — exercises the 0-APR fallback.
    {
      address: 'EQPool3',
      token0_address: USDC_ADDRESS,
      token1_address: USDT_ADDRESS,
      apy_1d: null,
      lp_total_supply_usd: '200000',
    },
  ],
};

// --- mock Omniston SDK ------------------------------------------------------

function settlementCase(q: unknown): string | undefined {
  if (typeof q !== 'object' || q === null || !('settlementData' in q)) return undefined;
  const data = (q as Record<string, unknown>).settlementData;
  if (typeof data !== 'object' || data === null) return undefined;
  return (data as { $case: string }).$case;
}

vi.mock('@ston-fi/omniston-sdk', () => {
  const Observable = {
    subscribe: vi.fn(),
  };

  const mockClient = {
    requestForQuote: vi.fn(() => Observable),
    tonBuildSwap: vi.fn(() => Promise.resolve(MOCK_TRANSACTION)),
    tonBuildEscrowTransfer: vi.fn(() => Promise.resolve(MOCK_TRANSACTION)),
    evmBuildOrderPayload: vi.fn(() => Promise.resolve(MOCK_EVM_ORDER_PAYLOAD)),
    orderRegisterSignedOrder: vi.fn(() => Promise.resolve(undefined)),
    swapTrack: vi.fn(() => Observable),
    orderTrack: vi.fn(() => Observable),
    orderDiscloseHtlcSecret: vi.fn(() => Promise.resolve(undefined)),
  };

  return {
    Omniston: vi.fn(() => mockClient),
    AutoReconnectTransport: vi.fn(),
    WebSocketTransport: vi.fn(),
    isSwapQuote: (q: unknown) => settlementCase(q) === 'swap',
    isOrderQuote: (q: unknown) => settlementCase(q) === 'order',
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

  it('maps STON.fi pool list to Pool[], keeping only USDC/USDT pools', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_POOLS_API,
    } as Response);

    const { discoverPools } = await import('../pools.js');
    const pools = await discoverPools();

    // EQPool2 (TON/USDT) is dropped — TON is not a supported stable.
    expect(pools).toHaveLength(2);
    expect(pools.map((p) => p.id)).toEqual(['EQPool1', 'EQPool3']);
    expect(pools.some((p) => p.name.includes('TON'))).toBe(false);
    expect(pools[0]).toMatchObject({
      id: 'EQPool1',
      name: 'USDT/USDC',
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

describe('discoverCrosschainPools', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  // DefiLlama wraps rows in { data: [...] } and capitalises chain names.
  const MOCK_LLAMA_API = {
    data: [
      { pool: 'p1', chain: 'Ethereum', project: 'aave-v3', symbol: 'USDC', tvlUsd: 5_000_000, apy: 4.2 },
      { pool: 'p2', chain: 'Base', project: 'morpho', symbol: 'USDC-USDT', tvlUsd: 2_000_000, apy: 6.1 },
      { pool: 'p3', chain: 'BSC', project: 'venus', symbol: 'USDT', tvlUsd: 1_000_000, apy: 3.0 },
      // Unsupported chain — dropped.
      { pool: 'p4', chain: 'Solana', project: 'kamino', symbol: 'USDC', tvlUsd: 9_000_000, apy: 9.9 },
      // Non-stable leg — dropped.
      { pool: 'p5', chain: 'Ethereum', project: 'uni-v3', symbol: 'USDC-WETH', tvlUsd: 9_000_000, apy: 20 },
      // Zero APY — dropped.
      { pool: 'p6', chain: 'Polygon', project: 'aave-v3', symbol: 'USDT', tvlUsd: 1_000_000, apy: 0 },
    ],
  };

  it('keeps only USDC/USDT pools on supported chains, normalising chain casing', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_LLAMA_API,
    } as Response);

    const { discoverCrosschainPools } = await import('../pools.js');
    const pools = await discoverCrosschainPools();

    expect(pools.map((p) => p.id)).toEqual(['p1', 'p2', 'p3']);
    expect(pools.every((p) => p.isCrosschain)).toBe(true);
    // chain is the last '-' segment, even when the symbol itself contains '-'.
    expect(pools.map((p) => p.assetPair.split('-').at(-1))).toEqual(['ethereum', 'base', 'bsc']);
    expect(pools[0].estimatedBridgeCostUsdt).toBe(50); // ethereum
  });

  it('returns an empty list when the API is unavailable', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
    } as Response);

    const { discoverCrosschainPools } = await import('../pools.js');
    await expect(discoverCrosschainPools()).resolves.toEqual([]);
  });
});

describe('getQuote', () => {
  it('resolves with the first swap quote emitted by the observable', async () => {
    const { getClient } = await import('../client.js');
    const client = getClient();

    vi.mocked(client.requestForQuote).mockReturnValueOnce({
      subscribe: (observer: { next: (e: unknown) => void }) => {
        observer.next({ $case: 'ack', value: { rfqId: 'rfq-1' } });
        observer.next({ $case: 'quoteUpdated', rfqId: 'rfq-1', value: MOCK_SWAP_QUOTE });
        return { unsubscribe: vi.fn() };
      },
    } as unknown as ReturnType<typeof client.requestForQuote>);

    const { getQuote } = await import('../quote.js');
    const result = await getQuote({
      inputAsset: { chain: 'ton', kind: 'native' },
      outputAsset: { chain: 'ton', kind: 'jetton', address: 'EQAddress123' },
      inputAmountUnits: '1000000000',
      traderAddress: { chain: 'ton', address: 'EQTrader' },
    });

    expect(result.rfqId).toBe('rfq-1');
    expect(result.quoteId).toBe('q-1');
    expect(result.resolverName).toBe('TestResolver');
    expect(result.outputUnits).toBe('2500000');
    expect(result.settlementMethod).toBe('swap');
    expect(result.traderAddress).toEqual({ chain: 'ton', address: 'EQTrader' });
  });

  it('rejects when the server reports no route for the pair', async () => {
    const { getClient } = await import('../client.js');
    const client = getClient();

    vi.mocked(client.requestForQuote).mockReturnValueOnce({
      subscribe: (observer: { next: (e: unknown) => void }) => {
        observer.next({ $case: 'noQuote', rfqId: 'rfq-1', value: {} });
        return { unsubscribe: vi.fn() };
      },
    } as unknown as ReturnType<typeof client.requestForQuote>);

    const { getQuote } = await import('../quote.js');
    await expect(
      getQuote({
        inputAsset: { chain: 'ton', kind: 'native' },
        outputAsset: { chain: 'ton', kind: 'jetton', address: 'EQAddress123' },
        inputAmountUnits: '1000000000',
        traderAddress: { chain: 'ton', address: 'EQTrader' },
      }),
    ).rejects.toThrow('no route');
  });

  it('rejects after timeoutMs when no quote is received', async () => {
    const { getClient } = await import('../client.js');
    const client = getClient();

    vi.mocked(client.requestForQuote).mockReturnValueOnce({
      subscribe: () => ({ unsubscribe: vi.fn() }),
    } as unknown as ReturnType<typeof client.requestForQuote>);

    const { getQuote } = await import('../quote.js');
    await expect(
      getQuote({
        inputAsset: { chain: 'ton', kind: 'native' },
        outputAsset: { chain: 'ton', kind: 'jetton', address: 'EQAddress123' },
        inputAmountUnits: '1000000000',
        traderAddress: { chain: 'ton', address: 'EQTrader' },
        timeoutMs: 50,
      }),
    ).rejects.toThrow('timed out');
  });
});

describe('executeRoute', () => {
  it('builds a TON swap transaction for same-chain swap quotes', async () => {
    const { getClient } = await import('../client.js');
    const client = getClient();
    vi.mocked(client.tonBuildSwap).mockClear();

    const { executeRoute } = await import('../execute.js');
    const quote: OmnistonQuote = {
      rfqId: 'rfq-1',
      quoteId: 'q-1',
      resolverName: 'TestResolver',
      inputAsset: { chain: 'ton', kind: 'native' },
      outputAsset: { chain: 'ton', kind: 'jetton', address: 'EQAddress123' },
      inputUnits: '1000000000',
      outputUnits: '2500000',
      settlementMethod: 'swap',
      traderAddress: { chain: 'ton', address: 'EQTrader' },
      raw: MOCK_SWAP_QUOTE as unknown as OmnistonQuote['raw'],
    };

    const result = await executeRoute({ quote, receiveAddress: { chain: 'ton', address: 'EQReceiver' } });

    expect(result).toEqual({ kind: 'tonTransaction', transaction: MOCK_TRANSACTION });
    expect(client.tonBuildSwap).toHaveBeenCalledWith({
      quoteId: 'q-1',
      transferSrcAddress: { chain: { $case: 'ton', value: 'EQTrader' } },
      traderDstAddress: { chain: { $case: 'ton', value: 'EQReceiver' } },
    });
  });

  it('builds a TON escrow transfer for cross-chain orders funded from TON', async () => {
    const { getClient } = await import('../client.js');
    const client = getClient();
    vi.mocked(client.tonBuildEscrowTransfer).mockClear();

    const { executeRoute } = await import('../execute.js');
    const quote: OmnistonQuote = {
      rfqId: 'rfq-2',
      quoteId: 'q-2',
      resolverName: 'TestResolver',
      inputAsset: { chain: 'ton', kind: 'jetton', address: 'EQUsdtJetton' },
      outputAsset: { chain: 'ethereum', kind: 'erc20', address: '0xUSDC' },
      inputUnits: '1000000000',
      outputUnits: '2500000',
      settlementMethod: 'order',
      traderAddress: { chain: 'ton', address: 'EQTrader' },
      raw: MOCK_TON_ORDER_QUOTE as unknown as OmnistonQuote['raw'],
    };

    const result = await executeRoute({ quote });

    expect(result).toEqual({ kind: 'tonTransaction', transaction: MOCK_TRANSACTION });
    expect(client.tonBuildEscrowTransfer).toHaveBeenCalledWith({
      quoteId: 'q-2',
      ownerSrcAddress: { chain: { $case: 'ton', value: 'EQTrader' } },
      traderDstAddress: undefined,
    });
  });

  it('builds an EVM order payload for cross-chain orders funded from an EVM chain', async () => {
    const { getClient } = await import('../client.js');
    const client = getClient();
    vi.mocked(client.evmBuildOrderPayload).mockClear();

    const { executeRoute } = await import('../execute.js');
    const quote: OmnistonQuote = {
      rfqId: 'rfq-3',
      quoteId: 'q-3',
      resolverName: 'TestResolver',
      inputAsset: { chain: 'ethereum', kind: 'erc20', address: '0xUSDC' },
      outputAsset: { chain: 'ton', kind: 'jetton', address: 'EQUsdtJetton' },
      inputUnits: '1000000000',
      outputUnits: '2500000',
      settlementMethod: 'order',
      traderAddress: { chain: 'ethereum', address: '0xTrader' },
      raw: MOCK_EVM_ORDER_QUOTE as unknown as OmnistonQuote['raw'],
    };

    const result = await executeRoute({ quote, receiveAddress: { chain: 'ton', address: 'EQReceiver' } });

    expect(result).toEqual({ kind: 'evmOrderPayload', payload: MOCK_EVM_ORDER_PAYLOAD });
    expect(client.evmBuildOrderPayload).toHaveBeenCalledWith({
      quoteId: 'q-3',
      ownerSrcAddress: { chain: { $case: 'ethereum', value: '0xTrader' } },
      traderDstAddress: { chain: { $case: 'ton', value: 'EQReceiver' } },
    });
  });
});

describe('registerSignedOrder', () => {
  it('forwards the signed order and owner address to the protocol', async () => {
    const { getClient } = await import('../client.js');
    const client = getClient();
    vi.mocked(client.orderRegisterSignedOrder).mockClear();

    const { registerSignedOrder } = await import('../execute.js');
    const signedOrder = {
      order: { $case: 'evmV1', value: { encodedOrder: new Uint8Array(), signature: new Uint8Array(), orderExtension: new Uint8Array() } },
    } as unknown as Parameters<typeof registerSignedOrder>[0]['signedOrder'];

    await registerSignedOrder({
      quoteId: 'q-3',
      ownerAddress: { chain: 'ethereum', address: '0xTrader' },
      signedOrder,
    });

    expect(client.orderRegisterSignedOrder).toHaveBeenCalledWith({
      quoteId: 'q-3',
      ownerSrcAddress: { chain: { $case: 'ethereum', value: '0xTrader' } },
      signedOrder,
      serializedOrderDetails: undefined,
    });
  });
});

describe('trackSwap', () => {
  it('subscribes to swap progress with a chain-tagged trader address', async () => {
    const { getClient } = await import('../client.js');
    const client = getClient();
    vi.mocked(client.swapTrack).mockClear();

    const { trackSwap } = await import('../track.js');
    trackSwap({ quoteId: 'q-1', traderAddress: { chain: 'ton', address: 'EQTrader' }, outgoingTxQuery: 'tx-hash' });

    expect(client.swapTrack).toHaveBeenCalledWith({
      quoteId: 'q-1',
      traderAddress: { chain: { $case: 'ton', value: 'EQTrader' } },
      outgoingTxQuery: 'tx-hash',
    });
  });
});

describe('trackOrder', () => {
  it('subscribes to order status with a chain-tagged trader address', async () => {
    const { getClient } = await import('../client.js');
    const client = getClient();
    vi.mocked(client.orderTrack).mockClear();

    const { trackOrder } = await import('../track.js');
    trackOrder({ quoteId: 'q-3', traderAddress: { chain: 'ethereum', address: '0xTrader' } });

    expect(client.orderTrack).toHaveBeenCalledWith({
      quoteId: 'q-3',
      traderAddress: { chain: { $case: 'ethereum', value: '0xTrader' } },
    });
  });
});

describe('discloseHtlcSecret', () => {
  it('forwards the secret for the given execution index', async () => {
    const { getClient } = await import('../client.js');
    const client = getClient();
    vi.mocked(client.orderDiscloseHtlcSecret).mockClear();

    const { discloseHtlcSecret } = await import('../track.js');
    const secret = new Uint8Array([1, 2, 3]);
    await discloseHtlcSecret({ quoteId: 'q-3', executionIndex: 0, secret });

    expect(client.orderDiscloseHtlcSecret).toHaveBeenCalledWith({ quoteId: 'q-3', executionIndex: 0, secret });
  });
});
