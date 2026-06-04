import { z } from 'zod';
import { MessageRoleSchema } from '../models/chat.js';

export const CreateSessionRequestSchema = z.object({
  title: z.string().max(200).trim().optional(),
});
export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>;

export const SessionResponseSchema = z.object({
  sessionId: z.string(),
  title: z.string(),
  createdAt: z.string().datetime(),
});
export type SessionResponse = z.infer<typeof SessionResponseSchema>;

export const SessionListItemSchema = z.object({
  sessionId: z.string(),
  title: z.string(),
  lastActivityAt: z.string().datetime(),
  messageCount: z.number().int().nonnegative(),
});
export type SessionListItem = z.infer<typeof SessionListItemSchema>;

export const MessageSchema = z.object({
  role: MessageRoleSchema,
  content: z.string(),
  createdAt: z.string().datetime(),
});
export type Message = z.infer<typeof MessageSchema>;

export const MessagesResponseSchema = z.object({
  messages: z.array(MessageSchema),
  hasMore: z.boolean(),
  nextCursor: z.string().optional(),
});
export type MessagesResponse = z.infer<typeof MessagesResponseSchema>;

export const SendMessageRequestSchema = z.object({
  content: z.string().min(1).max(32_000).trim(),
});
export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>;

export const ProposalEventSchema = z.object({
  type: z.literal('proposal'),
  data: z.object({
    quoteId: z.string(),
    summary: z.string(),
    estimatedYieldUsdt: z.number(),
    x402FeeUsdt: z.number(),
    netGainUsdt: z.number(),
  }),
});
export type ProposalEvent = z.infer<typeof ProposalEventSchema>;

export const SseEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('delta'), content: z.string() }),
  ProposalEventSchema,
  z.object({ type: z.literal('done') }),
  z.object({ type: z.literal('error'), message: z.string() }),
]);
export type SseEvent = z.infer<typeof SseEventSchema>;
