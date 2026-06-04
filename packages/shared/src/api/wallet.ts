import { z } from 'zod';

export const WalletConnectRequestSchema = z.object({
  walletAddress: z.string().min(1).max(128).trim(),
});
export type WalletConnectRequest = z.infer<typeof WalletConnectRequestSchema>;

export const WalletConnectResponseSchema = z.object({
  sessionToken: z.string(),
  walletAddress: z.string(),
});
export type WalletConnectResponse = z.infer<typeof WalletConnectResponseSchema>;
