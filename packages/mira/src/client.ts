import type { MiraRecommendation, SseEvent } from '@tonyx/shared';
import type { ChatMessage, ChatStream, MiraClientConfig, MiraContext } from './types.js';

const DEFAULT_BASE_URL = 'https://api.mira.network/v1';

export class MiraClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(config: MiraClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  /**
   * Evaluate whether a rebalance is worth executing given the current context.
   * Returns a structured recommendation the backend attaches to every proposal.
   */
  async evaluate(context: MiraContext): Promise<MiraRecommendation> {
    const res = await fetch(`${this.baseUrl}/evaluate`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ context }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Mira evaluate failed: ${res.status} ${text}`);
    }

    return res.json() as Promise<MiraRecommendation>;
  }

  /**
   * Send a chat message to Mira and stream the response as SSE events.
   * Yields delta/proposal/done/error events as they arrive.
   */
  async *chat(messages: ChatMessage[], context: MiraContext): ChatStream {
    const res = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: { ...this.headers(), Accept: 'text/event-stream' },
      body: JSON.stringify({ messages, context }),
    });

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '');
      yield { type: 'error', message: `Mira chat failed: ${res.status} ${text}` } satisfies SseEvent;
      return;
    }

    yield* parseSseStream(res.body);
  }
}

// ─── SSE stream parser ────────────────────────────────────────────────────────

async function* parseSseStream(body: ReadableStream<Uint8Array>): ChatStream {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;

        const raw = trimmed.slice(5).trim();
        if (!raw || raw === '[DONE]') continue;

        try {
          const event = JSON.parse(raw) as SseEvent;
          yield event;
          if (event.type === 'done') return;
        } catch {
          // malformed SSE line — skip silently
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  yield { type: 'done' } satisfies SseEvent;
}
