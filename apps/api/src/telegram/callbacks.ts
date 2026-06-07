import { randomUUID } from 'crypto';
import type { Context } from 'telegraf';
import { RunModel } from '../db/index.js';
import { consumePendingQuote } from '../services/pendingQuotes.js';
import { trackExecution, trackCrosschainExecution } from '../services/execution.js';

export async function handleCallbackQuery(ctx: Context): Promise<void> {
  if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;

  const data = ctx.callbackQuery.data;
  await ctx.answerCbQuery();

  if (data.startsWith('approve_')) {
    const token = data.slice('approve_'.length);
    await handleApprove(ctx, token);
  } else if (data.startsWith('dismiss_')) {
    const token = data.slice('dismiss_'.length);
    await handleDismiss(ctx, token);
  }
}

async function handleApprove(ctx: Context, approvalToken: string): Promise<void> {
  const pending = consumePendingQuote(approvalToken);

  if (!pending) {
    await ctx.editMessageText('⚠️ This proposal has expired. Use /rebalance for a fresh one.');
    return;
  }

  try {
    const executingMsg = pending.isCrosschain
      ? `⏳ Executing cross-chain rebalance to ${pending.destinationChain ?? 'destination'}…`
      : '⏳ Executing rebalance…';
    await ctx.editMessageText(executingMsg);

    const now = new Date();
    const run = await RunModel.create({
      walletAddress: pending.walletAddress,
      status: 'executing',
      originPool: pending.originPool,
      destinationPool: pending.destinationPool,
      routedAmountUsdt: pending.routedAmountUsdt,
      yieldEarnedUsdt: 0,
      approvalToken,
      createdAt: now,
      isCrosschain: pending.isCrosschain,
      destinationChain: pending.destinationChain,
      bridgeCostUsdt: pending.bridgeCostUsdt,
      settlementType: pending.settlementType,
    });

    // Cross-chain orders settle via the HTLC lifecycle tracker; same-chain swaps
    // use the TON transaction poller.
    const tracker = pending.isCrosschain
      ? trackCrosschainExecution(run._id, {
          quoteId: pending.omnistonQuote?.quoteId,
          walletAddress: pending.walletAddress,
          destinationChain: pending.destinationChain ?? 'destination',
        })
      : trackExecution(run._id, pending.walletAddress, now.getTime());

    // Fire-and-forget; send confirmation when done
    tracker
      .then(() =>
        RunModel.findById(run._id).lean().then((r) => {
          if (!r) return;
          if (r.status === 'completed') {
            const txLink = r.txHash
              ? ` · [tx](https://tonviewer.com/transaction/${r.txHash})`
              : '';
            const chainNote = r.isCrosschain
              ? ` on ${r.destinationChain ?? 'destination chain'}`
              : '';
            ctx
              .reply(
                `✅ *Rebalanced${chainNote}!*\n\n` +
                  `Earned $${r.yieldEarnedUsdt.toFixed(4)}${txLink}`,
                { parse_mode: 'Markdown', link_preview_options: { is_disabled: true } },
              )
              .catch(() => {});
          } else if (r.status === 'stuck') {
            ctx
              .reply(
                `⚠️ *Settlement stuck.*\n\nThe cross-chain order to ` +
                  `${r.destinationChain ?? 'the destination chain'} did not settle in time. ` +
                  `Your funds are safe in escrow — Tonyx will keep monitoring and resolve or ` +
                  `refund automatically. Check /status for updates.`,
                { parse_mode: 'Markdown' },
              )
              .catch(() => {});
          } else {
            ctx
              .reply(
                `❌ *Execution failed.*\n\nThe rebalance could not be completed. ` +
                  `Check /status and try /rebalance again.`,
                { parse_mode: 'Markdown' },
              )
              .catch(() => {});
          }
        }),
      )
      .catch(() => {});
  } catch (err) {
    console.error('[callback approve]', err);
    await ctx.editMessageText('❌ Execution failed. Please try /rebalance again.');
  }
}

async function handleDismiss(ctx: Context, approvalToken: string): Promise<void> {
  const pending = consumePendingQuote(approvalToken);

  if (pending) {
    // Record the skip so the run history reflects the dismissal
    await RunModel.create({
      walletAddress: pending.walletAddress,
      status: 'skipped',
      originPool: pending.originPool,
      destinationPool: pending.destinationPool,
      routedAmountUsdt: pending.routedAmountUsdt,
      yieldEarnedUsdt: 0,
      approvalToken: randomUUID(), // new token — the original was consumed above
      createdAt: new Date(),
      completedAt: new Date(),
    }).catch(() => {}); // best-effort; don't fail the dismiss if DB is down
  }

  await ctx.editMessageText(
    '⏭️ Proposal dismissed. Tonyx will keep watching for the next opportunity.',
  );
}
