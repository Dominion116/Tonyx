import { randomUUID } from 'crypto';
import { Router } from 'express';
import { buildContext } from '@tonyx/mira';
import {
  CreateSessionRequestSchema,
  SendMessageRequestSchema,
  type SessionResponse,
  type SessionListItem,
  type Message,
  type MessagesResponse,
  type SseEvent,
} from '@tonyx/shared';
import {
  ChatSessionModel,
  ChatMessageModel,
  PolicyModel,
  RunModel,
} from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { ApiError } from '../middleware/error.js';
import { requireX402Payment } from '../middleware/x402.js';
import { validate } from '../middleware/validate.js';
import { getPoolsFromCache } from '../cron/poolScanner.js';
import { fetchBalance } from '../services/tonapi.js';
import { miraClient } from '../services/mira.js';
import { buildMemoryContext } from '../lib/memory.js';
import { savePendingQuote } from '../services/pendingQuotes.js';
import { env } from '../env.js';

const router = Router();

// ─── POST /api/chat/sessions ──────────────────────────────────────────────────

/**
 * @openapi
 * /chat/sessions:
 *   post:
 *     summary: Create a new chat session
 *     tags: [Chat]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string, maxLength: 200 }
 *     responses:
 *       201:
 *         description: Session created
 */
router.post('/sessions', requireAuth, validate(CreateSessionRequestSchema), async (req, res, next) => {
  try {
    const walletAddress = req.wallet as string;
    const title = (req.body as { title?: string }).title ?? 'New Chat';
    const now = new Date();

    const session = await ChatSessionModel.create({
      walletAddress,
      title,
      deletedAt: null,
      createdAt: now,
      lastActivityAt: now,
    });

    const body: SessionResponse = {
      sessionId: session._id.toString(),
      title: session.title,
      createdAt: session.createdAt.toISOString(),
    };

    res.status(201).json(body);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/chat/sessions/:address ─────────────────────────────────────────

/**
 * @openapi
 * /chat/sessions/{address}:
 *   get:
 *     summary: List non-deleted sessions for a wallet
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Session list ordered by last activity
 */
router.get('/sessions/:address', requireAuth, async (req, res, next) => {
  try {
    const address = req.params['address'] as string;

    if (req.wallet !== address) {
      return next(ApiError.forbidden('You can only list your own sessions'));
    }

    const sessions = await ChatSessionModel.find({
      walletAddress: address,
      deletedAt: null,
    })
      .sort({ lastActivityAt: -1 })
      .lean();

    const messageCounts = await ChatMessageModel.aggregate<{ _id: string; count: number }>([
      { $match: { walletAddress: address } },
      { $group: { _id: '$sessionId', count: { $sum: 1 } } },
    ]);

    const countMap = new Map(messageCounts.map((r) => [r._id, r.count]));

    const body: SessionListItem[] = sessions.map((s) => ({
      sessionId: s._id.toString(),
      title: s.title,
      lastActivityAt: s.lastActivityAt.toISOString(),
      messageCount: countMap.get(s._id.toString()) ?? 0,
    }));

    res.json(body);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/chat/sessions/:sessionId/messages ───────────────────────────────

/**
 * @openapi
 * /chat/sessions/{sessionId}/messages:
 *   get:
 *     summary: Paginated message history for a session
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: before
 *         schema: { type: string }
 *         description: Cursor — return messages created before this ISO timestamp
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 30 }
 *     responses:
 *       200:
 *         description: Message page
 */
router.get('/sessions/:sessionId/messages', requireAuth, async (req, res, next) => {
  try {
    const sessionId = req.params['sessionId'] as string;

    if (!/^[a-f\d]{24}$/i.test(sessionId)) {
      return next(ApiError.notFound('Session not found'));
    }

    const session = await ChatSessionModel.findById(sessionId).lean();
    if (!session || session.deletedAt) {
      return next(ApiError.notFound('Session not found'));
    }
    if (session.walletAddress !== req.wallet) {
      return next(ApiError.forbidden('This session does not belong to your wallet'));
    }

    const limit = Math.min(parseInt((req.query['limit'] as string) ?? '30', 10), 100);
    const before = req.query['before'] as string | undefined;

    const query: Record<string, unknown> = { sessionId };
    if (before) {
      query['createdAt'] = { $lt: new Date(before) };
    }

    const docs = await ChatMessageModel.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = docs.length > limit;
    const messages = docs.slice(0, limit).reverse();

    const body: MessagesResponse = {
      messages: messages.map(
        (m): Message => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
          createdAt: m.createdAt.toISOString(),
        }),
      ),
      hasMore,
      nextCursor: hasMore ? messages[0].createdAt.toISOString() : undefined,
    };

    res.json(body);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/chat/sessions/:sessionId/messages ─────────────────────────────

/**
 * @openapi
 * /chat/sessions/{sessionId}/messages:
 *   post:
 *     summary: Send a message and stream Mira's response (x402 gated, SSE)
 *     tags: [Chat]
 *     parameters:
 *       - in: header
 *         name: X-Payment-Receipt
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content: { type: string, maxLength: 32000 }
 *     responses:
 *       200:
 *         description: SSE stream of delta / proposal / done events
 *         content:
 *           text/event-stream:
 *             schema: { type: string }
 */
router.post(
  '/sessions/:sessionId/messages',
  requireX402Payment,
  requireAuth,
  validate(SendMessageRequestSchema),
  async (req, res, next) => {
    try {
      const sessionId = req.params['sessionId'] as string;
      const walletAddress = req.wallet as string;
      const { content } = req.body as { content: string };

      // ── Validate session ownership ─────────────────────────────────────────
      const session = await ChatSessionModel.findById(sessionId).lean();
      if (!session || session.deletedAt) {
        return next(ApiError.notFound('Session not found'));
      }
      if (session.walletAddress !== walletAddress) {
        return next(ApiError.forbidden('This session does not belong to your wallet'));
      }

      // ── Assemble cross-session memory ──────────────────────────────────────
      const memoryContext = await buildMemoryContext(walletAddress, sessionId).catch(() => '');

      // ── Fetch live yield snapshot ──────────────────────────────────────────
      const [poolsResult, balanceResult, policyResult, runsResult] = await Promise.allSettled([
        getPoolsFromCache(),
        fetchBalance(walletAddress),
        PolicyModel.findOne({ walletAddress }).sort({ version: -1 }).lean(),
        RunModel.find({ walletAddress }).sort({ createdAt: -1 }).limit(3).lean(),
      ]);

      const pools = poolsResult.status === 'fulfilled' && poolsResult.value
        ? poolsResult.value.pools
            .filter((p) => p.liquidityUsdt >= 100_000 && p.aprPercent < 500_000)
            .sort((a, b) => b.aprPercent - a.aprPercent)
            .slice(0, 20)
        : [];

      const balance = balanceResult.status === 'fulfilled'
        ? { idleUsdt: balanceResult.value.idleUsdt, deployedUsdt: balanceResult.value.deployedUsdt }
        : { idleUsdt: 0, deployedUsdt: 0 };

      const policy = policyResult.status === 'fulfilled' && policyResult.value
        ? {
            minNetGainUsdt: policyResult.value.minNetGainUsdt,
            cooldownSeconds: policyResult.value.cooldownSeconds,
            spendingFloorUsdt: policyResult.value.spendingFloorUsdt,
            eligibleAssets: policyResult.value.eligibleAssets,
            approvalMode: policyResult.value.approvalMode as 'auto' | 'manual',
          }
        : {
            minNetGainUsdt: 1,
            cooldownSeconds: 3600,
            spendingFloorUsdt: 10,
            eligibleAssets: ['TON', 'USDT'],
            approvalMode: 'manual' as const,
          };

      const recentRuns = runsResult.status === 'fulfilled'
        ? runsResult.value.map((r) => ({
            status: r.status,
            originPool: r.originPool,
            destinationPool: r.destinationPool,
            yieldEarnedUsdt: r.yieldEarnedUsdt,
            x402FeeUsdt: r.x402FeeUsdt,
            completedAt: r.completedAt?.toISOString() ?? null,
          }))
        : [];

      // ── Fetch active session thread for context ────────────────────────────
      const recentThread = await ChatMessageModel.find({ sessionId })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

      const threadMessages = recentThread.reverse().map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      // Prepend memory block as a synthetic user message if present
      const messages = memoryContext
        ? [{ role: 'user' as const, content: memoryContext }, ...threadMessages, { role: 'user' as const, content }]
        : [...threadMessages, { role: 'user' as const, content }];

      const miraContext = buildContext({
        pools,
        topQuote: null,
        policy,
        balance,
        recentRuns,
      });

      // ── Save user message immediately ──────────────────────────────────────
      const userMsg = await ChatMessageModel.create({
        sessionId,
        walletAddress,
        role: 'user',
        content,
        contextSnapshot: null,
        createdAt: new Date(),
      }).catch(() => null);

      // ── Set up SSE response ────────────────────────────────────────────────
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
      res.flushHeaders();

      const writeSse = (event: SseEvent): boolean => {
        return res.write(`data: ${JSON.stringify(event)}\n\n`);
      };

      // ── Stream Mira response ───────────────────────────────────────────────
      let assistantContent = '';
      let contextSnapshot: Record<string, unknown> | null = null;
      let proposalData: SseEvent | null = null;

      try {
        for await (const event of miraClient.chat(messages, miraContext)) {
          writeSse(event);

          if (event.type === 'delta') {
            assistantContent += event.content;
          } else if (event.type === 'proposal') {
            proposalData = event;
            // Create a pending quote for the inline approve flow
            const token = randomUUID();
            savePendingQuote(token, {
              walletAddress,
              omnistonQuote: null!,
              originPool: 'current',
              destinationPool: 'top pool',
              routedAmountUsdt: balance.idleUsdt,
              estimatedYieldUsdt: event.data.estimatedYieldUsdt,
              x402FeeUsdt: event.data.x402FeeUsdt,
              netGainUsdt: event.data.netGainUsdt,
              expiresAt: Date.now() + 10 * 60 * 1_000,
            });
          } else if (event.type === 'done') {
            contextSnapshot = {
              pools: pools.slice(0, 5).map((p) => ({ name: p.name, aprPercent: p.aprPercent })),
              balance,
              policy,
              memoryIncluded: !!memoryContext,
            };
            break;
          } else if (event.type === 'error') {
            break;
          }
        }
      } catch (streamErr) {
        const errEvent: SseEvent = { type: 'error', message: 'Mira stream interrupted' };
        writeSse(errEvent);
      }

      // ── Save assistant message + update session ────────────────────────────
      await Promise.allSettled([
        assistantContent
          ? ChatMessageModel.create({
              sessionId,
              walletAddress,
              role: 'assistant',
              content: assistantContent || '…',
              contextSnapshot,
              createdAt: new Date(),
            })
          : Promise.resolve(),
        ChatSessionModel.findByIdAndUpdate(sessionId, {
          lastActivityAt: new Date(),
        }),
      ]);

      res.end();
    } catch (err) {
      // If headers not sent yet, let the error handler respond normally
      if (!res.headersSent) return next(err);
      res.end();
    }
  },
);

// ─── DELETE /api/chat/sessions/:sessionId ────────────────────────────────────

/**
 * @openapi
 * /chat/sessions/{sessionId}:
 *   delete:
 *     summary: Soft-delete a session (messages are retained for memory)
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Session soft-deleted
 */
router.delete('/sessions/:sessionId', requireAuth, async (req, res, next) => {
  try {
    const sessionId = req.params['sessionId'] as string;

    const session = await ChatSessionModel.findById(sessionId).lean();
    if (!session || session.deletedAt) {
      return next(ApiError.notFound('Session not found'));
    }
    if (session.walletAddress !== req.wallet) {
      return next(ApiError.forbidden('This session does not belong to your wallet'));
    }

    await ChatSessionModel.findByIdAndUpdate(sessionId, { deletedAt: new Date() });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
