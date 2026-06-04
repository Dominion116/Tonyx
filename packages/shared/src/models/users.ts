import { z } from 'zod';

export const UserSchema = z.object({
  walletAddress: z.string().min(1).max(128).trim(),
  sessionToken: z.string().optional(),
  telegramUserId: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;
