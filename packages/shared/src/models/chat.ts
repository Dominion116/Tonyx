import { z } from 'zod';

export const ChatSessionSchema = z.object({
  walletAddress: z.string().min(1).max(128).trim(),
  title: z.string().min(1).max(200).trim(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  lastActivityAt: z.date(),
});

export type ChatSession = z.infer<typeof ChatSessionSchema>;

export const MessageRoleSchema = z.enum(['user', 'assistant']);
export type MessageRole = z.infer<typeof MessageRoleSchema>;

export const ChatMessageSchema = z.object({
  sessionId: z.string().min(1),
  walletAddress: z.string().min(1).max(128).trim(),
  role: MessageRoleSchema,
  content: z.string().min(1).max(32_000).trim(),
  contextSnapshot: z.record(z.unknown()).nullable(),
  createdAt: z.date(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
