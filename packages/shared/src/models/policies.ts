import { z } from 'zod';

export const ApprovalModeSchema = z.enum(['auto', 'manual']);
export type ApprovalMode = z.infer<typeof ApprovalModeSchema>;

export const PolicySchema = z.object({
  walletAddress: z.string().min(1).max(128).trim(),
  minNetGainUsdt: z.number().nonnegative(),
  cooldownSeconds: z.number().int().nonnegative(),
  spendingFloorUsdt: z.number().nonnegative(),
  eligibleAssets: z.array(z.string().trim()).min(1),
  approvalMode: ApprovalModeSchema,
  walletSignature: z.string().min(1),
  version: z.number().int().positive(),
  createdAt: z.date(),
});

export type Policy = z.infer<typeof PolicySchema>;

export const PolicyCreateSchema = PolicySchema.omit({
  version: true,
  createdAt: true,
});
export type PolicyCreate = z.infer<typeof PolicyCreateSchema>;
