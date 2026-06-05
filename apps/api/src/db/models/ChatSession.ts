import { model, Schema } from 'mongoose';
import type { ChatSession } from '@tonyx/shared';

const schema = new Schema<ChatSession>(
  {
    walletAddress: { type: String, required: true, trim: true, maxlength: 128 },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    deletedAt: { type: Date, default: null },
    createdAt: { type: Date, required: true },
    lastActivityAt: { type: Date, required: true },
  },
  { timestamps: false },
);

schema.index({ walletAddress: 1, lastActivityAt: -1 });
schema.index({ deletedAt: 1 });

export const ChatSessionModel = model<ChatSession>(
  'ChatSession',
  schema,
  'chat_sessions',
);
