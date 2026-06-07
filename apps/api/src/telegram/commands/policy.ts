import type { Context } from 'telegraf';
import { UserModel, PolicyModel } from '../../db/index.js';

export async function handlePolicy(ctx: Context): Promise<void> {
  const telegramUserId = String(ctx.from?.id ?? '');

  try {
    const user = await UserModel.findOne({ telegramUserId }).lean();
    if (!user) {
      await ctx.reply('⚠️ No wallet connected. Open the Tonyx app first.');
      return;
    }

    const policy = await PolicyModel.findOne({ walletAddress: user.walletAddress })
      .sort({ version: -1 })
      .lean();

    if (!policy) {
      await ctx.reply(
        '📋 No policy configured yet.\n\nOpen the Tonyx app to set your yield rules.',
      );
      return;
    }

    const lines = [
      `📋 *Active Policy* (v${policy.version})\n`,
      `• *Min net gain:* $${policy.minNetGainUsdt} USDT`,
      `• *Spending floor:* $${policy.spendingFloorUsdt} USDT`,
      `• *Cooldown:* ${Math.round(policy.cooldownSeconds / 3600)}h`,
      `• *Assets:* ${policy.eligibleAssets.join(', ')}`,
      `• *Approval mode:* ${policy.approvalMode}`,
    ];

    await ctx.reply(lines.join('\n'), {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '✏️ Edit in app', url: 'https://tonyx-web.vercel.app/policy' }],
        ],
      },
    });
  } catch {
    await ctx.reply('⚠️ Could not fetch your policy. Try again shortly.');
  }
}
