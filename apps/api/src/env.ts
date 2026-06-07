import 'dotenv/config';

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const env = {
  port: parseInt(optional('PORT', '4000'), 10),

  mongoUri: optional('MONGODB_URI', ''),
  mongoDbName: optional('MONGODB_DB_NAME', 'tonyx'),

  sessionSecret: optional('SESSION_SECRET', 'dev-secret-change-in-prod'),

  omnistonApiKey: optional('OMNISTON_API_KEY', ''),
  tonapiKey: optional('TONAPI_KEY', ''),

  telegramBotToken: optional('TELEGRAM_BOT_TOKEN', ''),
  telegramWebhookSecret: optional('TELEGRAM_WEBHOOK_SECRET', ''),

  x402WalletAddress: optional('X402_WALLET_ADDRESS', ''),
  x402FeeUsdt: parseFloat(optional('X402_FEE_USDT', '0.10')),

  cronSecret: optional('CRON_SECRET', ''),

  corsOrigin: optional('CORS_ORIGIN', 'http://localhost:3000'),

  nodeEnv: optional('NODE_ENV', 'development'),
  isDev: optional('NODE_ENV', 'development') === 'development',
} as const;
