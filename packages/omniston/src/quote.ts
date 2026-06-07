import { isOrderQuote, isSwapQuote } from '@ston-fi/omniston-sdk';
import { buildAssetId } from './assets.js';
import { getClient } from './client.js';
import type { OmnistonQuote, QuoteParams, SettlementPreference } from './types.js';

const DEFAULT_SETTLEMENT: SettlementPreference[] = [{ method: 'swap' }];

function buildSettlementParams(prefs: SettlementPreference[]) {
  return prefs.map((pref) =>
    pref.method === 'swap'
      ? { params: { $case: 'swap' as const, value: { maxPriceSlippagePips: pref.maxSlippagePips } } }
      : { params: { $case: 'order' as const, value: {} } },
  );
}

export async function getQuote(params: QuoteParams): Promise<OmnistonQuote> {
  const {
    inputAsset,
    outputAsset,
    inputAmountUnits,
    traderAddress,
    settlement = DEFAULT_SETTLEMENT,
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
        amount: { $case: 'inputUnits', value: inputAmountUnits },
        settlementParams: buildSettlementParams(settlement),
      })
      .subscribe({
        next(event) {
          switch (event.$case) {
            case 'noQuote':
              done(() => reject(new Error('Omniston has no route for this asset pair right now')));
              break;
            case 'quoteUpdated': {
              const q = event.value;
              if (!isSwapQuote(q) && !isOrderQuote(q)) break;
              done(() =>
                resolve({
                  rfqId: event.rfqId,
                  quoteId: q.quoteId,
                  resolverName: q.resolverName,
                  inputAsset,
                  outputAsset,
                  inputUnits: q.inputUnits,
                  outputUnits: q.outputUnits,
                  settlementMethod: isSwapQuote(q) ? 'swap' : 'order',
                  traderAddress,
                  raw: q,
                }),
              );
              break;
            }
            // 'ack' just confirms the RFQ was received; keep waiting for a quote.
            // 'unsubscribed' is only emitted after we unsubscribe ourselves.
          }
        },
        error(err) {
          done(() => reject(err instanceof Error ? err : new Error(String(err))));
        },
      });
  });
}
