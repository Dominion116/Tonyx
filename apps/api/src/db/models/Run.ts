import { model, Schema } from 'mongoose';
import type { Run } from '@tonyx/shared';

const schema = new Schema<Run>(
  {
    walletAddress: { type: String, required: true, trim: true, maxlength: 128 },
    status: {
      type: String,
      enum: ['pending', 'executing', 'completed', 'failed', 'skipped'],
      required: true,
    },
    originPool: { type: String, required: true, trim: true },
    destinationPool: { type: String, required: true, trim: true },
    routedAmountUsdt: { type: Number, required: true, min: 0 },
    yieldEarnedUsdt: { type: Number, required: true, min: 0, default: 0 },
    txHash: { type: String },
    approvalToken: { type: String, required: true },
    createdAt: { type: Date, required: true },
    completedAt: { type: Date },
  },
  { timestamps: false },
);

schema.index({ walletAddress: 1, createdAt: -1 });
schema.index({ approvalToken: 1 }, { unique: true });

export const RunModel = model<Run>('Run', schema, 'runs');
