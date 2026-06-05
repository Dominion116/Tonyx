import { model, Schema } from 'mongoose';
import type { Policy } from '@tonyx/shared';

const schema = new Schema<Policy>(
  {
    walletAddress: { type: String, required: true, trim: true, maxlength: 128 },
    minNetGainUsdt: { type: Number, required: true, min: 0 },
    cooldownSeconds: { type: Number, required: true, min: 0 },
    spendingFloorUsdt: { type: Number, required: true, min: 0 },
    eligibleAssets: { type: [String], required: true },
    approvalMode: { type: String, enum: ['auto', 'manual'], required: true },
    walletSignature: { type: String, required: true },
    version: { type: Number, required: true, min: 1 },
    createdAt: { type: Date, required: true },
  },
  { timestamps: false },
);

schema.index({ walletAddress: 1, version: -1 });

export const PolicyModel = model<Policy>('Policy', schema, 'policies');
