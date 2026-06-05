import { model, Schema } from 'mongoose';
import type { ChatMessage } from '@tonyx/shared';

const schema = new Schema<ChatMessage>(
  {
    sessionId: { type: String, required: true },
    walletAddress: { type: String, required: true, trim: true, maxlength: 128 },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true, trim: true, maxlength: 32_000 },
    contextSnapshot: { type: Schema.Types.Mixed, default: null },
    createdAt: { type: Date, required: true },
  },
  { timestamps: false },
);

schema.index({ sessionId: 1, createdAt: 1 });
schema.index({ walletAddress: 1, createdAt: -1 });

export const ChatMessageModel = model<ChatMessage>(
  'ChatMessage',
  schema,
  'chat_messages',
);
