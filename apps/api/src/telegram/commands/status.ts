import type { Context } from 'telegraf';
import { UserModel, RunModel, PolicyModel } from '../../db/index.js';
import { fetchBalance } from '../../services/tonapi.js';

export async function handleStatus(ctx: Context): Promise<void> {
  const telegramUserId = String(ctx.from?.id ?? '');

  try {
    const user = await UserModel.findOne({ telegramUserId }).lean();
    if (!user) {
      await ctx.reply(
        '⚠️ No wallet connected. Open the Tonyx app to connect your TON wallet first.',
      );
      return;
    }

    const [balance, policy, lastRun] = await Promise.allSettled([
      fetchBalance(user.walletAddress),
      PolicyModel.findOne({ walletAddress: user.walletAddress }).sort({ version: -1 }).lean(),
      RunModel.findOne({ walletAddress: user.walletAddress, status: 'completed' })
        .sort({ completedAt: -1 })
        .lean(),
    ]);

    const bal = balance.status === 'fulfilled' ? balance.value : null;
    const pol = policy.status === 'fulfilled' ? policy.value : null;
    const run = lastRun.status === 'fulfilled' ? lastRun.value : null;

    const lines: string[] = [
      `*Tonyx Status* for \`${user.walletAddress.slice(0, 8)}…\`\n`,
      bal
        ? `💰 *Idle balance:* $${bal.idleUsdt.toFixed(2)} USDT\n` +
          `📈 *Deployed:* $${bal.deployedUsdt.toFixed(2)} USDT`
        : '💰 Balance unavailable',
      '',
      pol
        ? `📋 *Policy:* min gain $${pol.minNetGainUsdt} · ${pol.approvalMode} mode`
        : '📋 No policy set',
      '',
      run
        ? `✅ *Last run:* earned $${run.yieldEarnedUsdt.toFixed(4)} · fee $${run.x402FeeUsdt.toFixed(2)}`
        : '📭 No completed runs yet',
    ];

    await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown' });
  } catch {
    await ctx.reply('⚠️ Could not fetch your status right now. Try again in a moment.');
  }
}
