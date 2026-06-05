import { model, Schema } from 'mongoose';
import type { Notification } from '@tonyx/shared';

const schema = new Schema<Notification>(
  {
    walletAddress: { type: String, required: true, trim: true, maxlength: 128 },
    telegramUserId: { type: String, required: true },
    minGainAlertUsdt: { type: Number, required: true, min: 0 },
    quietHoursStart: { type: Number, required: true, min: 0, max: 23 },
    quietHoursEnd: { type: Number, required: true, min: 0, max: 23 },
    alertFrequency: {
      type: String,
      enum: ['immediate', 'hourly', 'daily'],
      required: true,
    },
    updatedAt: { type: Date, required: true },
  },
  { timestamps: false },
);

schema.index({ walletAddress: 1 }, { unique: true });

export const NotificationModel = model<Notification>(
  'Notification',
  schema,
  'notifications',
);
