import { isSwapQuote } from '@ston-fi/omniston-sdk';
import { getClient } from './client.js';
import type { OmnistonQuote, QuoteParams } from './types.js';

function buildAssetId(asset: string | 'native') {
  if (asset === 'native') {
    return { chain: { $case: 'ton' as const, value: { kind: { $case: 'native' as const, value: {} } } } };
  }
  return { chain: { $case: 'ton' as const, value: { kind: { $case: 'jetton' as const, value: asset } } } };
}

export async function getQuote(params: QuoteParams): Promise<OmnistonQuote> {
  const {
    inputAsset,
    outputAsset,
    inputAmountNano,
    maxSlippagePips = 50,
    timeoutMs = 15_000,
  } = params;

  const client = getClient();
  let settled = false;

  return new Promise<OmnistonQuote>((resolve, reject) => {
    let sub: { unsubscribe: () => void } | null = null;

    const done = (action: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      // Defer unsubscribe so `sub` is always assigned before we call it
      Promise.resolve().then(() => sub?.unsubscribe());
      action();
    };

    const timer = setTimeout(() => {
      done(() => reject(new Error('Omniston getQuote timed out')));
    }, timeoutMs);

    sub = client
      .requestForQuote({
        inputAsset: buildAssetId(inputAsset),
        outputAsset: buildAssetId(outputAsset),
        amount: { $case: 'inputUnits', value: inputAmountNano },
        settlementParams: [
          { params: { $case: 'swap', value: { maxPriceSlippagePips: maxSlippagePips } } },
        ],
      })
      .subscribe({
        next(event) {
          if (event.$case === 'quoteUpdated' && isSwapQuote(event.value)) {
            const q = event.value;
            done(() =>
              resolve({
                rfqId: event.rfqId,
                quoteId: q.quoteId,
                resolverName: q.resolverName,
                inputUnits: q.inputUnits,
                outputUnits: q.outputUnits,
                raw: q,
              }),
            );
          }
        },
        error(err) {
          done(() => reject(err instanceof Error ? err : new Error(String(err))));
        },
      });
  });
}
