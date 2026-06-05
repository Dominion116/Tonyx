import { ChatMessageModel } from '../db/index.js';

const MAX_MESSAGES = 40;
// Rough estimate: 1 token ≈ 4 characters
const MAX_TOKENS = 4_000;
const CHARS_PER_TOKEN = 4;

interface MemoryMessage {
  sessionId: string;
  role: string;
  content: string;
  createdAt: Date;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

function summariseSession(sessionId: string, messages: MemoryMessage[]): string {
  const preview = messages
    .slice(0, 6) // at most 6 messages per prior session in the summary
    .map((m) => `${m.role === 'user' ? 'User' : 'Tonyx'}: ${m.content.slice(0, 200)}`)
    .join(' | ');
  return `[Session ${sessionId.slice(-6)}] ${preview}`;
}

/**
 * Builds a condensed text block of the wallet's message history across all
 * sessions except the active one. Used as prior-context for Mira.
 *
 * Applies a sliding window: if the accumulated text exceeds MAX_TOKENS, the
 * oldest prior-session blocks are dropped first. The active session thread
 * is never included here (handled separately by the caller).
 */
export async function buildMemoryContext(
  walletAddress: string,
  activeSessionId: string,
): Promise<string> {
  const messages = await ChatMessageModel.find({
    walletAddress,
    sessionId: { $ne: activeSessionId },
  })
    .sort({ createdAt: -1 })
    .limit(MAX_MESSAGES)
    .lean();

  if (messages.length === 0) return '';

  // Group by sessionId, preserving most-recent-first order within each group
  const bySession = new Map<string, MemoryMessage[]>();
  for (const m of messages) {
    const sid = m.sessionId.toString();
    if (!bySession.has(sid)) bySession.set(sid, []);
    bySession.get(sid)!.push(m as MemoryMessage);
  }

  // Build per-session summary paragraphs, most recent session first
  const paragraphs: string[] = [];
  for (const [sid, msgs] of bySession) {
    paragraphs.push(summariseSession(sid, msgs));
  }

  // Sliding window: drop oldest paragraphs until under token budget
  while (paragraphs.length > 0) {
    const combined = paragraphs.join('\n');
    if (estimateTokens(combined) <= MAX_TOKENS) break;
    paragraphs.pop(); // drop oldest (last in array = oldest session)
  }

  if (paragraphs.length === 0) return '';

  return `--- Prior conversation context ---\n${paragraphs.join('\n')}\n--- End prior context ---`;
}
