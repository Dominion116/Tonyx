import type { Context } from 'telegraf';
import { UserModel, RunModel } from '../../db/index.js';

const STATUS_EMOJI: Record<string, string> = {
  completed: '✅',
  failed: '❌',
  skipped: '⏭️',
  executing: '⏳',
  pending: '🕐',
};

function formatRun(run: {
  status: string;
  destinationPool: string;
  yieldEarnedUsdt: number;
  x402FeeUsdt: number;
  txHash?: string;
  createdAt: Date;
}): string {
  const emoji = STATUS_EMOJI[run.status] ?? '•';
  const date = new Date(run.createdAt).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  });
  const tx = run.txHash
    ? ` · [tx](https://tonviewer.com/transaction/${run.txHash})`
    : '';
  return `${emoji} *${date}* — ${run.destinationPool} · +$${run.yieldEarnedUsdt.toFixed(4)} · fee $${run.x402FeeUsdt.toFixed(2)}${tx}`;
}

export async function handleHistory(ctx: Context): Promise<void> {
  const telegramUserId = String(ctx.from?.id ?? '');

  try {
    const user = await UserModel.findOne({ telegramUserId }).lean();
    if (!user) {
      await ctx.reply('⚠️ No wallet connected. Open the Tonyx app first.');
      return;
    }

    const runs = await RunModel.find({ walletAddress: user.walletAddress })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    if (runs.length === 0) {
      await ctx.reply('📭 No runs yet. Use /rebalance to trigger your first one.');
      return;
    }

    const lines = [`📜 *Last ${runs.length} run${runs.length === 1 ? '' : 's'}*\n`];
    for (const run of runs) {
      lines.push(formatRun(run));
    }

    await ctx.reply(lines.join('\n'), {
      parse_mode: 'Markdown',
      link_preview_options: { is_disabled: true },
    });
  } catch {
    await ctx.reply('⚠️ Could not load your history. Try again shortly.');
  }
}
