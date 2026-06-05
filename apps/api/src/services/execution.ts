import type { Types } from 'mongoose';
import { RunModel } from '../db/index.js';
import { env } from '../env.js';
import { invalidateBalanceCache } from './tonapi.js';

const TONAPI_BASE = 'https://tonapi.io/v2';
const POLL_INTERVAL_MS = 5_000;
const POLL_TIMEOUT_MS = 5 * 60 * 1_000; // 5 minutes

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
