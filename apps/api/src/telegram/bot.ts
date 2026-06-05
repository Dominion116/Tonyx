import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import { env } from '../env.js';
import { handleStart } from './commands/start.js';
import { handleStatus } from './commands/status.js';
import { handleRebalance } from './commands/rebalance.js';
import { handlePolicy } from './commands/policy.js';
import { handleHistory } from './commands/history.js';
import { handleCallbackQuery } from './callbacks.js';

let bot: Telegraf | null = null;

export function getBot(): Telegraf {
  if (!bot) {
    if (!env.telegramBotToken) {
      throw new Error('TELEGRAM_BOT_TOKEN is not set');
    }
    bot = new Telegraf(env.telegramBotToken);

    // Command handlers
    bot.command('start', handleStart);
    bot.command('status', handleStatus);
    bot.command('rebalance', handleRebalance);
    bot.command('policy', handlePolicy);
    bot.command('history', handleHistory);

    // Inline keyboard callback handler
    bot.on('callback_query', handleCallbackQuery);
  }
  return bot;
}

/**
 * Register bot commands with Telegram so they appear in the command menu.
 * Called once on startup when TELEGRAM_BOT_TOKEN is configured.
 */
export async function registerBotCommands(): Promise<void> {
  try {
    const b = getBot();
    await b.telegram.setMyCommands([
      { command: 'start',     description: 'Welcome message and launch Tonyx' },
      { command: 'status',    description: 'Your current balance and active position' },
      { command: 'rebalance', description: 'Request a Mira-evaluated rebalance proposal' },
      { command: 'policy',    description: 'View your active yield policy' },
      { command: 'history',   description: 'Last five rebalance runs' },
    ]);
    console.log('[telegram] Bot commands registered');
  } catch (err) {
    console.warn('[telegram] Could not register commands:', (err as Error).message);
  }
}
