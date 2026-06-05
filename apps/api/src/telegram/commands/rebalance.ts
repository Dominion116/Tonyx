import { randomUUID } from 'crypto';
import type { Context } from 'telegraf';
import { buildContext } from '@tonyx/mira';
import { UserModel, PolicyModel, RunModel } from '../../db/index.js';
import { getPoolsFromCache } from '../../cron/poolScanner.js';
import { fetchBalance } from '../../services/tonapi.js';
import { miraClient } from '../../services/mira.js';
import { savePendingQuote } from '../../services/pendingQuotes.js';
import { env } from '../../env.js';

export async function handleRebalance(ctx: Context): Promise<void> {
  const telegramUserId = String(ctx.from?.id ?? '');

  try {
    const user = await UserModel.findOne({ telegramUserId }).lean();
    if (!user) {
      await ctx.reply('⚠️ No wallet connected. Open the Tonyx app first.');
      return;
    }

    await ctx.reply('🔍 Analysing current pools with Mira…');

    const [poolsResult, balResult, policyResult, runsResult] = await Promise.allSettled([
      getPoolsFromCache(),
      fetchBalance(user.walletAddress),
      PolicyModel.findOne({ walletAddress: user.walletAddress }).sort({ version: -1 }).lean(),
      RunModel.find({ walletAddress: user.walletAddress }).sort({ createdAt: -1 }).limit(3).lean(),
    ]);

    const pools =
      poolsResult.status === 'fulfilled' && poolsResult.value
        ? poolsResult.value.pools
            .filter((p) => p.liquidityUsdt >= 100_000 && p.aprPercent < 500_000)
            .sort((a, b) => b.aprPercent - a.aprPercent)
            .slice(0, 20)
        : [];

    const balance =
      balResult.status === 'fulfilled'
        ? { idleUsdt: balResult.value.idleUsdt, deployedUsdt: balResult.value.deployedUsdt }
        : { idleUsdt: 0, deployedUsdt: 0 };

    const pol = policyResult.status === 'fulfilled' ? policyResult.value : null;
    if (!pol) {
      await ctx.reply('⚠️ No policy set. Open the app to configure your yield policy first.');
      return;
    }

    const policy = {
      minNetGainUsdt: pol.minNetGainUsdt,
      cooldownSeconds: pol.cooldownSeconds,
      spendingFloorUsdt: pol.spendingFloorUsdt,
      eligibleAssets: pol.eligibleAssets,
      approvalMode: pol.approvalMode as 'auto' | 'manual',
    };

    const recentRuns =
      runsResult.status === 'fulfilled'
        ? runsResult.value.map((r) => ({
            status: r.status,
            originPool: r.originPool,
            destinationPool: r.destinationPool,
            yieldEarnedUsdt: r.yieldEarnedUsdt,
            x402FeeUsdt: r.x402FeeUsdt,
            completedAt: r.completedAt?.toISOString() ?? null,
          }))
        : [];

    if (pools.length === 0) {
      await ctx.reply('⚠️ No pool data available right now. Try again shortly.');
      return;
    }

    const topPool = pools[0];
    const idleAmount = Math.max(balance.idleUsdt - policy.spendingFloorUsdt, 0);
    const dailyYield = (idleAmount * topPool.aprPercent) / 100 / 365;
    const netGain = parseFloat((dailyYield - env.x402FeeUsdt).toFixed(4));

    const miraContext = buildContext({
      pools,
      topQuote: {
        originPool: 'idle USDT',
        destinationPool: topPool.name,
        routedAmountUsdt: idleAmount,
        estimatedYieldUsdt: dailyYield,
        bridgeCostUsdt: 0,
        x402FeeUsdt: env.x402FeeUsdt,
        netGainUsdt: netGain,
      },
      policy,
      balance,
      recentRuns,
    });

    const rec = await miraClient.evaluate(miraContext).catch(() => ({
      proceed: netGain > policy.minNetGainUsdt,
      confidence: 0.7,
      explanation: `Top pool: ${topPool.name} at ${topPool.aprPercent.toFixed(2)}% APR. Estimated daily net gain: $${netGain}.`,
      suggestedAction: `Rebalance $${idleAmount.toFixed(2)} into ${topPool.name}`,
    }));

    if (!rec.proceed) {
      await ctx.reply(
        `🤔 *Mira says: not now*\n\n${rec.explanation}`,
        { parse_mode: 'Markdown' },
      );
      return;
    }

    // Store pending quote for approve callback
    const approvalToken = randomUUID();
    savePendingQuote(approvalToken, {
      walletAddress: user.walletAddress,
      omnistonQuote: null!,
      originPool: 'idle USDT',
      destinationPool: topPool.name,
      routedAmountUsdt: idleAmount,
      estimatedYieldUsdt: dailyYield,
      x402FeeUsdt: env.x402FeeUsdt,
      netGainUsdt: netGain,
      expiresAt: Date.now() + 10 * 60 * 1_000,
    });

    const msg =
      `💡 *Mira Proposal* (confidence: ${(rec.confidence * 100).toFixed(0)}%)\n\n` +
      `${rec.explanation}\n\n` +
      `*Route:* idle USDT → ${topPool.name}\n` +
      `*Amount:* $${idleAmount.toFixed(2)}\n` +
      `*Est. yield:* $${dailyYield.toFixed(4)}\n` +
      `*Fee:* $${env.x402FeeUsdt.toFixed(2)}\n` +
      `*Net gain:* $${netGain.toFixed(4)}`;

    await ctx.reply(msg, {
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
    console.error('[/rebalance]', err);
    await ctx.reply('⚠️ Something went wrong. Please try again.');
  }
}
