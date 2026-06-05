import 'express';

declare module 'express-serve-static-core' {
  interface Request {
    /** Wallet address extracted from a valid JWT session token */
    wallet?: string;
  }
}
