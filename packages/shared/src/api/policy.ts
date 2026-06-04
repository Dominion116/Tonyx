import { z } from 'zod';
import { ApprovalModeSchema } from '../models/policies.js';

export const PolicyRequestSchema = z.object({
  minNetGainUsdt: z.number().nonnegative(),
  cooldownSeconds: z.number().int().nonnegative(),
  spendingFloorUsdt: z.number().nonnegative(),
  eligibleAssets: z.array(z.string().trim()).min(1),
  approvalMode: ApprovalModeSchema,
  walletSignature: z.string().min(1),
});
export type PolicyRequest = z.infer<typeof PolicyRequestSchema>;

export const PolicyVersionSchema = z.object({
  version: z.number().int().positive(),
  minNetGainUsdt: z.number(),
  cooldownSeconds: z.number(),
  spendingFloorUsdt: z.number(),
  eligibleAssets: z.array(z.string()),
  approvalMode: ApprovalModeSchema,
  createdAt: z.string().datetime(),
});
export type PolicyVersion = z.infer<typeof PolicyVersionSchema>;

export const PolicyResponseSchema = z.object({
  active: PolicyVersionSchema,
  history: z.array(PolicyVersionSchema),
});
export type PolicyResponse = z.infer<typeof PolicyResponseSchema>;
