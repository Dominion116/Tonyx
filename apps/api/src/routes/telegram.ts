import { Router } from 'express';
import { verifyTelegramWebhook } from '../middleware/telegram.js';
import { getBot } from '../telegram/bot.js';
import { env } from '../env.js';

const router = Router();

/**
 * @openapi
 * /telegram/webhook:
 *   post:
 *     summary: Telegram Bot webhook receiver
 *     tags: [Telegram]
 *     security: []
 *     parameters:
 *       - in: header
 *         name: X-Telegram-Bot-Api-Secret-Token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Update processed
 *       403:
 *         description: Invalid webhook secret
 */
router.post('/', verifyTelegramWebhook, (req, res) => {
  if (!env.telegramBotToken) {
    res.sendStatus(200); // no-op if bot is not configured
    return;
  }

  try {
    const bot = getBot();
    // Telegraf's callback middleware processes the update and calls res.sendStatus(200)
    void bot.handleUpdate(req.body, res);
  } catch (err) {
    console.error('[telegram webhook]', err);
    res.sendStatus(200); // always 200 to Telegram to avoid retries
  }
});

export default router;
