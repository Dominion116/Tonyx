import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './env.js';
import { errorHandler } from './middleware/error.js';
import { createSwaggerRouter } from './swagger.js';
import healthRouter from './routes/health.js';
import walletRouter from './routes/wallet.js';
import balanceRouter from './routes/balance.js';
import poolsRouter from './routes/pools.js';
import policyRouter from './routes/policy.js';
import agentRouter from './routes/agent.js';

export function createApp(): express.Application {
  const app = express();

  // ── Security headers ─────────────────────────────────────────────────────
  app.use(helmet());

  // ── CORS ─────────────────────────────────────────────────────────────────
  const allowedOrigins = [
    env.corsOrigin,
    'https://web.telegram.org',
  ].filter(Boolean);

  app.use(
    cors({
      origin: (origin, cb) => {
        // Allow server-to-server requests (no Origin header) and listed origins
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error(`CORS: origin ${origin} not allowed`));
      },
      credentials: true,
    }),
  );

  // ── Body parsing ─────────────────────────────────────────────────────────
  app.use(express.json({ limit: '256kb' }));

  // ── Routes ───────────────────────────────────────────────────────────────
  app.use('/health', healthRouter);
  app.use('/api/docs', createSwaggerRouter());
  app.use('/api/wallet', walletRouter);
  app.use('/api/balance', balanceRouter);
  app.use('/api/pools', poolsRouter);
  app.use('/api/policy', policyRouter);
  app.use('/api/agent', agentRouter);

  // 404 catch-all for unmatched /api/* paths
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
  });

  // ── Global error handler ─────────────────────────────────────────────────
  app.use(errorHandler);

  return app;
}
