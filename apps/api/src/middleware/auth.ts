import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../env.js';
import { ApiError } from './error.js';

interface SessionPayload {
  sub: string; // walletAddress
}

/** Verifies the Bearer JWT and attaches req.wallet. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Missing or malformed Authorization header'));
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, env.sessionSecret) as SessionPayload;
    if (!payload.sub) throw new Error('Missing sub claim');
    req.wallet = payload.sub;
    next();
  } catch {
    next(ApiError.unauthorized('Invalid or expired session token'));
  }
}

/** Signs a JWT for the given wallet address. */
export function signSessionToken(walletAddress: string): string {
  return jwt.sign({ sub: walletAddress }, env.sessionSecret, { expiresIn: '30d' });
}
