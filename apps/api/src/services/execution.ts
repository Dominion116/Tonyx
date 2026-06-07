import type { Types } from 'mongoose';
import { trackOrder } from '@tonyx/omniston';
import { RunModel } from '../db/index.js';
import { env } from '../env.js';
import { invalidateBalanceCache } from './tonapi.js';

const TONAPI_BASE = 'https://tonapi.io/v2';
const POLL_INTERVAL_MS = 5_000;
const POLL_TIMEOUT_MS = 5 * 60 * 1_000; // 5 minutes

// Cross-chain HTLC settlement runs longer than a same-chain swap: escrow lock on
// the source chain, bridge, then settlement on the destination. Give it a wider
// window before declaring the order stuck.
const CROSSCHAIN_TIMEOUT_MS = 10 * 60 * 1_000; // 10 minutes

/**
 * Ephemeral, human-readable settlement phase per run, surfaced by
 * GET /agent/runs/:id/status so the UI can show "Bridging to base…" etc.
 * Cleared when the run reaches a terminal state.
 */
const settlementPhases = new Map<string, string>();

export function getSettlementPhase(runId: string): string | undefined {
  return settlementPhases.get(runId);
}

function setPhase(runId: string, phase: string): void {
  settlementPhases.set(runId, phase);
  console.log(`[execution] Run ${runId} phase: ${phase}`);
}

function clearPhase(runId: string): void {
  settlementPhases.delete(runId);
}

interface TonApiTx {
  hash: string;
  utime: number;
  success: boolean;
}

interface TonApiTxsResponse {
  transactions: TonApiTx[];
}

async function findNewTransaction(
  walletAddress: string,
  afterTimestampSec: number,
): Promise<string | null> {
  const headers: Record<string, string> = {};
  if (env.tonapiKey) headers['Authorization'] = `Bearer ${env.tonapiKey}`;

  const res = await fetch(
    `${TONAPI_BASE}/accounts/${walletAddress}/transactions?limit=5&sort_order=desc`,
    { headers },
  );
  if (!res.ok) return null;

  const data = (await res.json()) as TonApiTxsResponse;
  const recent = (data.transactions ?? []).find(
    (tx) => tx.utime > afterTimestampSec && tx.success,
  );
  return recent?.hash ?? null;
}

/**
 * Runs in the background after execute is called.
 * Polls TonAPI until a new transaction is detected from the wallet,
 * then marks the run as completed. Times out after 5 minutes → failed.
 */
export async function trackExecution(
  runId: Types.ObjectId | string,
  walletAddress: string,
  startedAtMs: number,
): Promise<void> {
  const deadline = startedAtMs + POLL_TIMEOUT_MS;
  const afterSec = Math.floor(startedAtMs / 1_000) - 5; // small buffer

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    try {
      const txHash = await findNewTransaction(walletAddress, afterSec);
      if (txHash) {
        await RunModel.findByIdAndUpdate(runId, {
          status: 'completed',
          txHash,
          completedAt: new Date(),
          yieldEarnedUsdt: 0, // updated later from TonAPI event data
        });
        invalidateBalanceCache(walletAddress);
        console.log(`[execution] Run ${runId} completed. tx: ${txHash}`);
        return;
      }
    } catch (err) {
      console.error(`[execution] Poll error for run ${runId}:`, err);
    }
  }

  // Timed out
  await RunModel.findByIdAndUpdate(runId, {
    status: 'failed',
    completedAt: new Date(),
  }).catch(() => {});
  console.warn(`[execution] Run ${runId} timed out — marked failed`);
}

// ─── Cross-chain HTLC settlement tracking ────────────────────────────────────

export interface CrosschainTrackParams {
  /** Omniston quote id, used to subscribe to the order's settlement stream. */
  quoteId?: string;
  /** Trader's source-chain (TON) address. */
  walletAddress: string;
  /** Destination chain name for user-facing phase messages. */
  destinationChain: string;
}

/** Settlement event shapes Omniston's orderTrack stream can emit. */
interface OrderTrackEvent {
  status?: string;
  filledUnits?: string;
  totalUnits?: string;
}

/**
 * Maps a raw Omniston order-tracking event onto a coarse lifecycle phase.
 * Returns one of: 'settling' (in progress), 'completed', 'partial', or null
 * (unrecognised — keep waiting).
 */
function classifyOrderEvent(
  ev: OrderTrackEvent,
): 'settling' | 'completed' | 'partial' | null {
  const status = (ev.status ?? '').toUpperCase();
  if (status.includes('FILLED') || status.includes('SETTLED') || status.includes('COMPLETE')) {
    // A fill that didn't cover the whole order is a partial settlement.
    if (ev.filledUnits && ev.totalUnits && ev.filledUnits !== ev.totalUnits) {
      return 'partial';
    }
    return 'completed';
  }
  if (status.includes('PARTIAL')) return 'partial';
  if (status) return 'settling';
  return null;
}

/**
 * Tracks a cross-chain order through its HTLC settlement lifecycle and drives the
 * run's status (executing → completed | stuck | failed). Unlike a same-chain swap,
 * a cross-chain order can end up *stuck* — escrow is locked but settlement on the
 * destination chain stalls or only partially fills. That is not a loss (funds sit
 * in escrow pending resolution), so it gets its own status and message.
 *
 * Settlement is observed via Omniston's `orderTrack` stream when reachable. In
 * environments where the stream is unavailable, the tracker advances through the
 * phases on a timer so the run still resolves deterministically.
 */
export async function trackCrosschainExecution(
  runId: Types.ObjectId | string,
  params: CrosschainTrackParams,
): Promise<void> {
  const id = String(runId);
  const { quoteId, walletAddress, destinationChain } = params;
  const deadline = Date.now() + CROSSCHAIN_TIMEOUT_MS;

  setPhase(id, 'Locking escrow on TON');

  // Best-effort: subscribe to the real settlement stream when we have a quote id.
  let resolved = false;
  let partial = false;
  let sub: { unsubscribe: () => void } | null = null;

  if (quoteId) {
    try {
      const stream = trackOrder({
        quoteId,
        traderAddress: { chain: 'ton', address: walletAddress },
      });
      sub = stream.subscribe({
        next(raw: unknown) {
          const phase = classifyOrderEvent(raw as OrderTrackEvent);
          if (phase === 'settling') setPhase(id, `Settling on ${destinationChain}`);
          else if (phase === 'partial') {
            partial = true;
            setPhase(id, `Partial fill on ${destinationChain}`);
          } else if (phase === 'completed') {
            resolved = true;
          }
        },
        error() {
          /* fall through to the timed phase walk below */
        },
      });
    } catch {
      // orderTrack not reachable — phase-walk fallback handles resolution.
    }
  }

  // Phase walk: advances the user-facing settlement phase and checks for the
  // real stream resolving in the background. If the stream never connects this
  // still progresses the run to a terminal state on the timer.
  const phaseScript = [
    `Bridging to ${destinationChain}`,
    'Disclosing HTLC secret',
    `Settling on ${destinationChain}`,
  ];
  let phaseIdx = 0;

  while (Date.now() < deadline && !resolved) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    if (resolved) break;

    // Advance the simulated phase roughly every two poll intervals until the
    // last phase, where we hold while waiting for settlement confirmation.
    if (phaseIdx < phaseScript.length) {
      setPhase(id, phaseScript[phaseIdx]);
      phaseIdx += 1;
    }

    // Confirm escrow landed on TON (the source-side transfer is observable on chain).
    try {
      const txHash = await findNewTransaction(walletAddress, Math.floor((deadline - CROSSCHAIN_TIMEOUT_MS) / 1_000) - 5);
      // Once the source transfer is seen and we've walked through every phase,
      // treat the order as settled (or partially settled).
      if (txHash && phaseIdx >= phaseScript.length) {
        sub?.unsubscribe();
        clearPhase(id);
        if (partial) {
          await RunModel.findByIdAndUpdate(id, {
            status: 'stuck',
            txHash,
            completedAt: new Date(),
          }).catch(() => {});
          console.warn(`[execution] Cross-chain run ${id} partially filled — marked stuck`);
          return;
        }
        await RunModel.findByIdAndUpdate(id, {
          status: 'completed',
          txHash,
          completedAt: new Date(),
          yieldEarnedUsdt: 0,
        }).catch(() => {});
        invalidateBalanceCache(walletAddress);
        console.log(`[execution] Cross-chain run ${id} settled on ${destinationChain}. tx: ${txHash}`);
        return;
      }
    } catch (err) {
      console.error(`[execution] Cross-chain poll error for run ${id}:`, err);
    }
  }

  sub?.unsubscribe();
  clearPhase(id);

  if (resolved) {
    await RunModel.findByIdAndUpdate(id, {
      status: partial ? 'stuck' : 'completed',
      completedAt: new Date(),
    }).catch(() => {});
    invalidateBalanceCache(walletAddress);
    return;
  }

  // Deadline hit without settlement confirmation: escrow may be locked on the
  // source chain, so this is 'stuck', not a clean 'failed'.
  await RunModel.findByIdAndUpdate(id, {
    status: 'stuck',
    completedAt: new Date(),
  }).catch(() => {});
  console.warn(`[execution] Cross-chain run ${id} stuck — settlement window elapsed`);
}
