import type { Context } from 'telegraf';
import { env } from '../../env.js';

const MINI_APP_URL = env.isDev
  ? 'https://tonyx.app' // placeholder until Phase 4 deploys the Mini App
  : 'https://tonyx.app';

export async function handleStart(ctx: Context): Promise<void> {
  const firstName = ctx.from?.first_name ?? 'there';

  await ctx.reply(
    `👋 Hey ${firstName}!\n\n` +
    `*Tonyx* is your autonomous yield agent on TON. It monitors STON.fi pools, ` +
    `evaluates opportunities using Mira AI, and rebalances your idle USDT when the math makes sense — ` +
    `only within limits you set.\n\n` +
    `*What you can do here:*\n` +
    `• /status — check your balance and active position\n` +
    `• /rebalance — request a yield proposal right now\n` +
    `• /policy — view your current rules\n` +
    `• /history — see your last five runs\n\n` +
    `Open the app to connect your wallet and configure your policy.`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🚀 Launch Tonyx',
              url: MINI_APP_URL,
            },
          ],
        ],
      },
    },
  );
}
