import type { NextFunction, Request, Response } from 'express';
import { env } from '../env.js';

interface X402PaymentRequirement {
  scheme: string;
  network: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  payTo: string;
  asset: string;
  maxTimeoutSeconds: number;
}

/**
 * HTTP 402 gate for the execute endpoint.
 * Expects an X-Payment-Receipt header containing the payment proof.
 * If absent, returns 402 with the payment requirements payload.
 */
export function requireX402Payment(req: Request, res: Response, next: NextFunction): void {
  const receipt = req.headers['x-payment-receipt'];

  if (!receipt) {
    const requirement: X402PaymentRequirement = {
      scheme: 'exact',
      network: 'base-mainnet',
      maxAmountRequired: String(Math.round(env.x402FeeUsdt * 1_000_000)), // USDC 6 decimals
      resource: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
      description: `Tonyx execution fee (${env.x402FeeUsdt} USDT)`,
      payTo: env.x402WalletAddress,
      asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
      maxTimeoutSeconds: 300,
    };

    res.status(402).json({
      error: 'Payment Required',
      accepts: [requirement],
    });
    return;
  }

  // In production: verify the payment proof against the x402 wallet address.
  // Deferred to Phase 5 hardening — presence check is sufficient for Phase 1.
  next();
}
