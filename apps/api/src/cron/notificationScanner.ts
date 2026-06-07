import { randomUUID } from 'crypto';
import cron from 'node-cron';
import {
  NotificationModel,
  PolicyModel,
  RunModel,
  UserModel,
} from '../db/index.js';
import { getPoolsFromCache } from './poolScanner.js';
import { fetchBalance } from '../services/tonapi.js';
import { evaluateRebalance } from '../services/advisor.js';
import { savePendingQuote } from '../services/pendingQuotes.js';
import { trackExecution, trackCrosschainExecution } from '../services/execution.js';
import { getBot } from '../telegram/bot.js';
import { env } from '../env.js';

// In-memory throttle: walletAddress → timestamp of last notification sent
const lastNotified = new Map<string, Date>();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isQuietHour(start: number, end: number): boolean {
  const hour = new Date().getUTCHours();
  // start > end means overnight range e.g. 22–8
  return start <= end
    ? hour >= start && hour < end
    : hour >= start || hour < end;
}

function shouldThrottle(walletAddress: string, frequency: string): boolean {
  const last = lastNotified.get(walletAddress);
  if (!last) return false;
  const elapsed = Date.now() - last.getTime();
  if (frequency === 'hourly') return elapsed < 60 * 60 * 1_000;
  if (frequency === 'daily') return elapsed < 24 * 60 * 60 * 1_000;
  return false; // 'immediate' — only the 60 s scanner interval acts as throttle
}

function markNotified(walletAddress: string): void {
  lastNotified.set(walletAddress, new Date());
}

// ─── Per-wallet scan ──────────────────────────────────────────────────────────

async function scanWallet(
  walletAddress: string,
  telegramUserId: string,
  alertFrequency: string,
  quietHoursStart: number,
  quietHoursEnd: number,
): Promise<void> {
  if (isQuietHour(quietHoursStart, quietHoursEnd)) return;
  if (shouldThrottle(walletAddress, alertFrequency)) return;

  // Fetch policy
  const policy = await PolicyModel.findOne({ walletAddress })
    .sort({ version: -1 })
    .lean();
  if (!policy) return;

  // Check cooldown
  const lastRun = await RunModel.findOne({
    walletAddress,
    status: { $in: ['completed', 'executing'] },
  })
    .sort({ createdAt: -1 })
    .lean();

  if (lastRun) {
    const elapsed = (Date.now() - new Date(lastRun.createdAt).getTime()) / 1_000;
    if (elapsed < policy.cooldownSeconds) return;
  }

  // Get pools and balance
  const cache = await getPoolsFromCache().catch(() => null);
  const pools = (cache?.pools ?? [])
    .filter((p) => p.liquidityUsdt >= 100_000 && p.aprPercent < 500_000)
    .sort((a, b) => b.aprPercent - a.aprPercent);
  if (pools.length === 0) return;

  const balance = await fetchBalance(walletAddress).catch(() => null);
  if (!balance) return;

  const topPool = pools[0];
  const idleAmount = Math.max(balance.idleUsdt - policy.spendingFloorUsdt, 0);
  if (idleAmount <= 0) return;

  const dailyYield = (idleAmount * topPool.aprPercent) / 100 / 365;
  if (dailyYield < policy.minNetGainUsdt) return;

  const isCrosschain = topPool.isCrosschain === true;
  const crosschain: CrosschainMeta = {
    isCrosschain,
    destinationChain: isCrosschain
      ? (topPool.assetPair.split('-')[1] ?? 'destination')
      : undefined,
    bridgeCostUsdt: topPool.estimatedBridgeCostUsdt,
  };

  const rec = evaluateRebalance({
    originPool: 'idle USDT',
    destinationPool: topPool.name,
    aprPercent: topPool.aprPercent,
    routedAmountUsdt: idleAmount,
    estimatedYieldUsdt: dailyYield,
    minNetGainUsdt: policy.minNetGainUsdt,
    estimatedBridgeCostUsdt: crosschain.bridgeCostUsdt,
    destinationChain: crosschain.destinationChain,
  });

  if (!rec.proceed) return;

  markNotified(walletAddress);

  if (policy.approvalMode === 'auto') {
    await dispatchAutoExecute(
      walletAddress,
      telegramUserId,
      topPool.name,
      idleAmount,
      dailyYield,
      rec.explanation,
      crosschain,
    );
  } else {
    await dispatchManualApproval(
      walletAddress,
      telegramUserId,
      topPool.name,
      idleAmount,
      dailyYield,
      rec.explanation,
      rec.confidence,
      crosschain,
    );
  }
}

/** Cross-chain settlement metadata threaded through the dispatch helpers. */
interface CrosschainMeta {
  isCrosschain: boolean;
  destinationChain?: string;
  bridgeCostUsdt?: number;
}

// ─── Dispatch: manual approval ────────────────────────────────────────────────

async function dispatchManualApproval(
  walletAddress: string,
  telegramUserId: string,
  poolName: string,
  amount: number,
  estimatedYield: number,
  explanation: string,
  confidence: number,
  crosschain: CrosschainMeta,
): Promise<void> {
  const approvalToken = randomUUID();
  savePendingQuote(approvalToken, {
    walletAddress,
    omnistonQuote: null!,
    originPool: 'idle USDT',
    destinationPool: poolName,
    routedAmountUsdt: amount,
    estimatedYieldUsdt: estimatedYield,
    expiresAt: Date.now() + 10 * 60 * 1_000,
    isCrosschain: crosschain.isCrosschain,
    destinationChain: crosschain.destinationChain,
    bridgeCostUsdt: crosschain.bridgeCostUsdt,
    settlementType: crosschain.isCrosschain ? 'order' : 'swap',
  });

  const crosschainLine = crosschain.isCrosschain
    ? `\n*Bridge:* cross-chain to ${crosschain.destinationChain}` +
      (crosschain.bridgeCostUsdt !== undefined
        ? ` (~$${crosschain.bridgeCostUsdt.toFixed(2)} cost)`
        : '')
    : '';

  const msg =
    `💡 *Rebalance Opportunity* (${(confidence * 100).toFixed(0)}% confidence)\n\n` +
    `${explanation}\n\n` +
    `*Route:* idle USDT → ${poolName}\n` +
    `*Amount:* $${amount.toFixed(2)}\n` +
    `*Est. daily yield:* $${estimatedYield.toFixed(4)}` +
    crosschainLine;

  try {
    const bot = getBot();
    await bot.telegram.sendMessage(telegramUserId, msg, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Approve', callback_data: `approve_${approvalToken}` },
            { text: '❌ Dismiss', callback_data: `dismiss_${approvalToken}` },
          ],
        ],
      },
    });
  } catch (err) {
    console.error(`[notify] Failed to send manual proposal to ${telegramUserId}:`, err);
  }
}

// ─── Dispatch: auto-execute ───────────────────────────────────────────────────

async function dispatchAutoExecute(
  walletAddress: string,
  telegramUserId: string,
  poolName: string,
  amount: number,
  estimatedYield: number,
  explanation: string,
  crosschain: CrosschainMeta,
): Promise<void> {
  const approvalToken = randomUUID();

  try {
    const now = new Date();
    const run = await RunModel.create({
      walletAddress,
      status: 'executing',
      originPool: 'idle USDT',
      destinationPool: poolName,
      routedAmountUsdt: amount,
      yieldEarnedUsdt: 0,
      approvalToken,
      createdAt: now,
      isCrosschain: crosschain.isCrosschain,
      destinationChain: crosschain.destinationChain,
      bridgeCostUsdt: crosschain.bridgeCostUsdt,
      settlementType: crosschain.isCrosschain ? 'order' : 'swap',
    });

    const bot = getBot();
    const bridgeNote = crosschain.isCrosschain
      ? ` (cross-chain to ${crosschain.destinationChain})`
      : '';
    await bot.telegram.sendMessage(
      telegramUserId,
      `⚙️ *Auto-rebalancing…*${bridgeNote}\n\n${explanation}`,
      { parse_mode: 'Markdown' },
    );

    // Cross-chain orders settle through the HTLC lifecycle tracker.
    const tracker = crosschain.isCrosschain
      ? trackCrosschainExecution(run._id, {
          walletAddress,
          destinationChain: crosschain.destinationChain ?? 'destination',
        })
      : trackExecution(run._id, walletAddress, now.getTime());

    // Track and send confirmation when done
    tracker
      .then(() =>
        RunModel.findById(run._id)
          .lean()
          .then((r) => {
            if (!r) return;
            const txLink = r.txHash
              ? ` · [tx](https://tonviewer.com/transaction/${r.txHash})`
              : '';
            const chainNote = r.isCrosschain
              ? ` on ${r.destinationChain ?? 'destination chain'}`
              : '';
            let msg: string;
            if (r.status === 'completed') {
              msg = `✅ *Rebalanced${chainNote}!* Earned $${r.yieldEarnedUsdt.toFixed(4)}${txLink}`;
            } else if (r.status === 'stuck') {
              msg =
                `⚠️ *Settlement stuck.* The cross-chain order to ` +
                `${r.destinationChain ?? 'the destination chain'} did not settle in time. ` +
                `Funds are safe in escrow; Tonyx is monitoring for resolution.`;
            } else {
              msg = `❌ *Auto-rebalance failed.* Check /status and try /rebalance manually.`;
            }
            return bot.telegram.sendMessage(telegramUserId, msg, {
              parse_mode: 'Markdown',
              link_preview_options: { is_disabled: true },
            });
          }),
      )
      .catch(() => {});
  } catch (err) {
    console.error(`[notify] Auto-execute failed for ${walletAddress}:`, err);
  }
}

// ─── Main scanner loop ────────────────────────────────────────────────────────

export async function runNotificationScan(): Promise<void> {
  if (!env.telegramBotToken) return; // bot not configured

  try {
    const prefs = await NotificationModel.find({
      telegramUserId: { $exists: true, $ne: '' },
    }).lean();

    await Promise.allSettled(
      prefs.map((p) =>
        scanWallet(
          p.walletAddress,
          p.telegramUserId,
          p.alertFrequency,
          p.quietHoursStart,
          p.quietHoursEnd,
        ),
      ),
    );
  } catch (err) {
    console.error('[notification-scanner] Scan error:', err);
  }
}

export function startNotificationScanner(): void {
  cron.schedule('*/1 * * * *', () => void runNotificationScan());
  console.log('[notification-scanner] Started (60 s interval)');
}
