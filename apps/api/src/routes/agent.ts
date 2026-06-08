import { randomUUID } from 'crypto';
import { Router } from 'express';
import { getQuote as omnistonGetQuote } from '@tonyx/omniston';
import {
  QuoteRequestSchema,
  ExecuteRequestSchema,
  type QuoteResponse,
  type ExecuteResponse,
  type RunSummary,
  type RunsResponse,
  type RunStatusResponse,
} from '@tonyx/shared';
import { PolicyModel, RunModel } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { ApiError } from '../middleware/error.js';
import { validate } from '../middleware/validate.js';
import { getPoolsFromCache } from '../cron/poolScanner.js';
import { evaluateRebalance } from '../services/advisor.js';
import { savePendingQuote, consumePendingQuote } from '../services/pendingQuotes.js';
import { trackExecution, trackCrosschainExecution, getSettlementPhase } from '../services/execution.js';

const router = Router();

const USDT_DECIMALS = 1_000_000;

function getExactRouteCostUsdt(quote: { raw: unknown } | null): number | undefined {
  if (!quote) return undefined;

  const raw = quote.raw as {
    protocolFeeUnits?: string;
    integratorFeeUnits?: string;
  };

  if (raw.protocolFeeUnits === undefined && raw.integratorFeeUnits === undefined) {
    return undefined;
  }

  const protocolFeeUnits = Number(raw.protocolFeeUnits ?? 0);
  const integratorFeeUnits = Number(raw.integratorFeeUnits ?? 0);
  const totalUnits = protocolFeeUnits + integratorFeeUnits;

  if (!Number.isFinite(totalUnits)) return undefined;

  return Number((totalUnits / USDT_DECIMALS).toFixed(6));
}

// ─── POST /api/agent/quote ────────────────────────────────────────────────────

/**
 * @openapi
 * /agent/quote:
 *   post:
 *     summary: Request a rebalance quote evaluated by Tonyx's advisor engine
 *     tags: [Agent]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [walletAddress, idleAmountUsdt]
 *             properties:
 *               walletAddress: { type: string }
 *               idleAmountUsdt: { type: number, minimum: 0 }
 *     responses:
 *       200:
 *         description: Quote with advisor recommendation and one-time approval token
 *       402:
 *         description: Payment required
 *       403:
 *         description: Policy eligibility check failed
 */
router.post('/quote', requireAuth, validate(QuoteRequestSchema), async (req, res, next) => {
  try {
    const { walletAddress, idleAmountUsdt, destinationPoolId } = req.body as {
      walletAddress: string;
      idleAmountUsdt: number;
      destinationPoolId?: string;
    };

    if (req.wallet !== walletAddress) {
      return next(ApiError.forbidden('walletAddress must match your session'));
    }

    // ── Fetch active policy ──────────────────────────────────────────────────
    const activePolicy = await PolicyModel.findOne({ walletAddress })
      .sort({ version: -1 })
      .lean()
      .catch(() => null);

    if (!activePolicy) {
      return next(ApiError.badRequest('No policy found — set a policy before requesting a quote', 'NO_POLICY'));
    }

    // ── Cooldown check ───────────────────────────────────────────────────────
    const lastRun = await RunModel.findOne({
      walletAddress,
      status: { $in: ['completed', 'executing'] },
    })
      .sort({ createdAt: -1 })
      .lean()
      .catch(() => null);

    if (lastRun) {
      const elapsed = (Date.now() - new Date(lastRun.createdAt).getTime()) / 1_000;
      if (elapsed < activePolicy.cooldownSeconds) {
        const remainingSec = Math.ceil(activePolicy.cooldownSeconds - elapsed);
        return next(
          ApiError.badRequest(
            `Cooldown active — ${remainingSec}s remaining`,
            'COOLDOWN_ACTIVE',
          ),
        );
      }
    }

    // ── Pick requested pool from cache, or fall back to best pool ────────────
    const cache = await getPoolsFromCache().catch(() => null);
    const pools = cache?.pools ?? [];
    const eligible = pools
      .filter(
        (p) =>
          p.liquidityUsdt >= 100_000 && // minimum liquidity filter
          p.aprPercent > 0 &&
          p.aprPercent < 500_000, // filter noise
      )
      .sort((a, b) => b.aprPercent - a.aprPercent);

    if (eligible.length === 0) {
      return next(ApiError.internal('No eligible pools available'));
    }

    const destinationPool = destinationPoolId
      ? eligible.find((p) => p.id === destinationPoolId)
      : eligible[0];

    if (!destinationPool) {
      return next(ApiError.badRequest('Selected pool is no longer eligible', 'POOL_NOT_ELIGIBLE'));
    }

    const originPool = eligible.find((p) => p.id !== destinationPool.id) ?? destinationPool;

    // ── Cross-chain route metadata ───────────────────────────────────────────
    const isCrosschain = destinationPool.isCrosschain === true;
    const destinationChain = isCrosschain
      ? (destinationPool.assetPair.split('-').at(-1) ?? 'destination')
      : undefined;
    const bridgeCostUsdt = destinationPool.estimatedBridgeCostUsdt;
    const settlementType: 'swap' | 'order' = isCrosschain ? 'order' : 'swap';

    // ── Estimate yield ───────────────────────────────────────────────────────
    const dailyYieldPct = destinationPool.aprPercent / 365;
    const estimatedYieldUsdt = parseFloat(((idleAmountUsdt * dailyYieldPct) / 100).toFixed(4));

    // ── Policy gain eligibility ──────────────────────────────────────────────
    if (estimatedYieldUsdt < activePolicy.minNetGainUsdt) {
      return next(
        ApiError.badRequest(
          `Estimated yield $${estimatedYieldUsdt} is below policy minimum $${activePolicy.minNetGainUsdt}`,
          'BELOW_MIN_GAIN',
        ),
      );
    }

    // ── Omniston quote (best-effort — falls back to estimate if unavailable) ─
    let omnistonQuote = null;
    try {
      // Convert USDT amount to nanotons equivalent (rough: 1 USDT ≈ 1e6 nanoUSDT)
      const inputNano = String(Math.round(idleAmountUsdt * 1_000_000));
      const USDT_ADDRESS = 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs';
      omnistonQuote = await omnistonGetQuote({
        inputAsset: { chain: 'ton', kind: 'jetton', address: USDT_ADDRESS },
        outputAsset: { chain: 'ton', kind: 'native' },
        inputAmountUnits: inputNano,
        traderAddress: { chain: 'ton', address: walletAddress },
        timeoutMs: 8_000,
      });
    } catch {
      // Omniston not reachable in dev — continue with estimate only
    }

    // ── Advisor evaluation ───────────────────────────────────────────────────
    const advisorRec = evaluateRebalance({
      originPool: originPool.name,
      destinationPool: destinationPool.name,
      aprPercent: destinationPool.aprPercent,
      routedAmountUsdt: idleAmountUsdt,
      estimatedYieldUsdt,
      minNetGainUsdt: activePolicy.minNetGainUsdt,
      estimatedBridgeCostUsdt: bridgeCostUsdt,
      destinationChain,
    });

    // ── Generate approval token ──────────────────────────────────────────────
    const approvalToken = randomUUID();
    const routeCostUsdt = getExactRouteCostUsdt(omnistonQuote);

    savePendingQuote(approvalToken, {
      walletAddress,
      omnistonQuote: omnistonQuote!,
      originPool: originPool.name,
      destinationPool: destinationPool.name,
      routedAmountUsdt: idleAmountUsdt,
      estimatedYieldUsdt,
      expiresAt: Date.now() + 10 * 60 * 1_000,
      isCrosschain,
      destinationChain,
      bridgeCostUsdt,
      settlementType,
    });

    const body: QuoteResponse = {
      approvalToken,
      originPool: originPool.name,
      destinationPool: destinationPool.name,
      destinationAprPercent: destinationPool.aprPercent,
      routedAmountUsdt: idleAmountUsdt,
      estimatedYieldUsdt,
      routeCostUsdt,
      mira: advisorRec,
      isCrosschain,
      destinationChain,
      bridgeCostUsdt,
    };

    res.json(body);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/agent/execute ──────────────────────────────────────────────────

/**
 * @openapi
 * /agent/execute:
 *   post:
 *     summary: Execute an approved quote
 *     tags: [Agent]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [approvalToken]
 *             properties:
 *               approvalToken: { type: string }
 *     responses:
 *       200:
 *         description: Run created and execution started
 *       400:
 *         description: Invalid or expired approval token
 */
router.post(
  '/execute',
  requireAuth,
  validate(ExecuteRequestSchema),
  async (req, res, next) => {
    try {
      const { approvalToken } = req.body as { approvalToken: string };

      const pending = consumePendingQuote(approvalToken);
      if (!pending) {
        return next(ApiError.badRequest('Approval token is invalid or expired', 'INVALID_TOKEN'));
      }

      if (pending.walletAddress !== req.wallet) {
        return next(ApiError.forbidden('Approval token does not belong to your wallet'));
      }

      const now = new Date();
      const run = await RunModel.create({
        walletAddress: pending.walletAddress,
        status: 'executing',
        originPool: pending.originPool,
        destinationPool: pending.destinationPool,
        routedAmountUsdt: pending.routedAmountUsdt,
        yieldEarnedUsdt: 0,
        approvalToken,
        createdAt: now,
        isCrosschain: pending.isCrosschain,
        destinationChain: pending.destinationChain,
        bridgeCostUsdt: pending.bridgeCostUsdt,
        settlementType: pending.settlementType,
      });

      // Fire-and-forget execution coroutine. Cross-chain orders settle through the
      // HTLC lifecycle tracker; same-chain swaps use the TON transaction poller.
      if (pending.isCrosschain) {
        void trackCrosschainExecution(run._id, {
          quoteId: pending.omnistonQuote?.quoteId,
          walletAddress: pending.walletAddress,
          destinationChain: pending.destinationChain ?? 'destination',
        });
      } else {
        void trackExecution(run._id, pending.walletAddress, now.getTime());
      }

      const body: ExecuteResponse = {
        runId: run._id.toString(),
        status: 'executing',
      };

      res.json(body);
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /api/agent/runs/:address ────────────────────────────────────────────

/**
 * @openapi
 * /agent/runs/{address}:
 *   get:
 *     summary: Paginated run history for a wallet
 *     tags: [Agent]
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Run list with pagination cursor
 */
router.get('/runs/:address', requireAuth, async (req, res, next) => {
  try {
    const address = req.params['address'] as string;

    if (req.wallet !== address) {
      return next(ApiError.forbidden('You can only view your own runs'));
    }

    const limit = Math.min(parseInt((req.query['limit'] as string) ?? '20', 10), 100);
    const cursor = req.query['cursor'] as string | undefined;

    const query: Record<string, unknown> = { walletAddress: address };
    if (cursor) {
      query['_id'] = { $lt: cursor };
    }

    const docs = await RunModel.find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = docs.length > limit;
    const runs = docs.slice(0, limit);

    const body: RunsResponse = {
      runs: runs.map(
        (r): RunSummary => ({
          id: r._id.toString(),
          status: r.status as RunSummary['status'],
          originPool: r.originPool,
          destinationPool: r.destinationPool,
          routedAmountUsdt: r.routedAmountUsdt,
          yieldEarnedUsdt: r.yieldEarnedUsdt,
          txHash: r.txHash,
          createdAt: r.createdAt.toISOString(),
          completedAt: r.completedAt?.toISOString(),
          isCrosschain: r.isCrosschain,
          destinationChain: r.destinationChain,
          bridgeCostUsdt: r.bridgeCostUsdt,
        }),
      ),
      nextCursor: hasMore ? runs[runs.length - 1]._id.toString() : undefined,
      hasMore,
    };

    res.json(body);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/agent/runs/:id/status ──────────────────────────────────────────

/**
 * @openapi
 * /agent/runs/{id}/status:
 *   get:
 *     summary: Get current status of a single run
 *     tags: [Agent]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Run status
 *       404:
 *         description: Run not found
 */
router.get('/runs/:id/status', requireAuth, async (req, res, next) => {
  try {
    const runId = req.params['id'] as string;

    const run = await RunModel.findById(runId).lean();
    if (!run) {
      return next(ApiError.notFound('Run not found'));
    }

    if (run.walletAddress !== req.wallet) {
      return next(ApiError.forbidden('This run does not belong to your wallet'));
    }

    const body: RunStatusResponse = {
      id: run._id.toString(),
      status: run.status as RunStatusResponse['status'],
      txHash: run.txHash,
      isCrosschain: run.isCrosschain,
      destinationChain: run.destinationChain,
      settlementPhase: getSettlementPhase(run._id.toString()),
    };

    res.json(body);
  } catch (err) {
    next(err);
  }
});

export default router;
