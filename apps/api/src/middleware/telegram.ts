import type { NextFunction, Request, Response } from 'express';
import { env } from '../env.js';
import { ApiError } from './error.js';

/**
 * Verifies the X-Telegram-Bot-Api-Secret-Token header on incoming webhook
 * requests. Rejects with 403 if the token is missing or does not match.
 */
export function verifyTelegramWebhook(req: Request, _res: Response, next: NextFunction): void {
  if (!env.telegramWebhookSecret) {
    // No secret configured — pass through (dev mode only)
    return next();
  }

  const incoming = req.headers['x-telegram-bot-api-secret-token'];
  if (incoming !== env.telegramWebhookSecret) {
    return next(ApiError.forbidden('Invalid Telegram webhook secret'));
  }

  next();
}
