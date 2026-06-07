import { randomUUID } from 'crypto';
import type { Context } from 'telegraf';
import { buildAskMiraDeepLink } from '@tonyx/shared';
import { UserModel, PolicyModel } from '../../db/index.js';
import { getPoolsFromCache } from '../../cron/poolScanner.js';
import { fetchBalance } from '../../services/tonapi.js';
import { evaluateRebalance } from '../../services/advisor.js';
import { savePendingQuote } from '../../services/pendingQuotes.js';

export async function handleRebalance(ctx: Context): Promise<void> {
  const telegramUserId = String(ctx.from?.id ?? '');

  try {
    const user = await UserModel.findOne({ telegramUserId }).lean();
    if (!user) {
      await ctx.reply('⚠️ No wallet connected. Open the Tonyx app first.');
      return;
    }

    await ctx.reply('🔍 Analysing current pools…');

    const [poolsResult, balResult, policyResult] = await Promise.allSettled([
      getPoolsFromCache(),
      fetchBalance(user.walletAddress),
      PolicyModel.findOne({ walletAddress: user.walletAddress }).sort({ version: -1 }).lean(),
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

    if (pools.length === 0) {
      await ctx.reply('⚠️ No pool data available right now. Try again shortly.');
      return;
    }

    const topPool = pools[0];
    const idleAmount = Math.max(balance.idleUsdt - policy.spendingFloorUsdt, 0);
    const dailyYield = (idleAmount * topPool.aprPercent) / 100 / 365;

    const rec = evaluateRebalance({
      originPool: 'idle USDT',
      destinationPool: topPool.name,
      aprPercent: topPool.aprPercent,
      routedAmountUsdt: idleAmount,
      estimatedYieldUsdt: dailyYield,
      minNetGainUsdt: policy.minNetGainUsdt,
    });

    if (!rec.proceed) {
      await ctx.reply(
        `🤔 *Tonyx says: not now*\n\n${rec.explanation}`,
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
      expiresAt: Date.now() + 10 * 60 * 1_000,
    });

    const msg =
      `💡 *Tonyx Proposal* (confidence: ${(rec.confidence * 100).toFixed(0)}%)\n\n` +
      `${rec.explanation}\n\n` +
      `*Route:* idle USDT → ${topPool.name}\n` +
      `*Amount:* $${idleAmount.toFixed(2)}\n` +
      `*Est. yield:* $${dailyYield.toFixed(4)}`;

    const askMiraUrl = buildAskMiraDeepLink({
      originPool: 'idle USDT',
      destinationPool: topPool.name,
      routedAmountUsdt: idleAmount,
      aprPercent: topPool.aprPercent,
      estimatedYieldUsdt: dailyYield,
      confidence: rec.confidence,
      explanation: rec.explanation,
    });

    await ctx.reply(msg, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Approve', callback_data: `approve_${approvalToken}` },
            { text: '❌ Dismiss', callback_data: `dismiss_${approvalToken}` },
          ],
          [{ text: '🔮 Ask Mira for a second opinion', url: askMiraUrl }],
        ],
      },
    });
  } catch (err) {
    console.error('[/rebalance]', err);
    await ctx.reply('⚠️ Something went wrong. Please try again.');
  }
}
