import { model, Schema } from 'mongoose';
import type { User } from '@tonyx/shared';

const schema = new Schema<User>(
  {
    walletAddress: { type: String, required: true, trim: true, maxlength: 128 },
    sessionToken: { type: String },
    telegramUserId: { type: String },
  },
  { timestamps: true },
);

schema.index({ walletAddress: 1 }, { unique: true });

export const UserModel = model<User>('User', schema, 'users');
