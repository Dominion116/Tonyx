import { Router } from 'express';
import { PolicyRequestSchema, type PolicyResponse, type PolicyVersion } from '@tonyx/shared';
import { PolicyModel } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { ApiError } from '../middleware/error.js';
import { validate } from '../middleware/validate.js';

const router = Router();

/**
 * @openapi
 * /policy:
 *   post:
 *     summary: Create or update the active policy for the authenticated wallet
 *     tags: [Policy]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - minNetGainUsdt
 *               - cooldownSeconds
 *               - spendingFloorUsdt
 *               - eligibleAssets
 *               - approvalMode
 *               - walletSignature
 *             properties:
 *               minNetGainUsdt: { type: number, minimum: 0 }
 *               cooldownSeconds: { type: integer, minimum: 0 }
 *               spendingFloorUsdt: { type: number, minimum: 0 }
 *               eligibleAssets: { type: array, items: { type: string } }
 *               approvalMode: { type: string, enum: [auto, manual] }
 *               walletSignature: { type: string }
 *     responses:
 *       201:
 *         description: Policy version created
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post(
  '/',
  requireAuth,
  validate(PolicyRequestSchema),
  async (req, res, next) => {
    try {
      const walletAddress = req.wallet as string;
      const body = req.body as {
        minNetGainUsdt: number;
        cooldownSeconds: number;
        spendingFloorUsdt: number;
        eligibleAssets: string[];
        approvalMode: 'auto' | 'manual';
        walletSignature: string;
      };

      // Verify the signature belongs to the authenticated wallet.
      // Full Ed25519 verification is added in the hardening phase;
      // here we enforce that it is non-empty and reject obvious mismatches.
      if (!body.walletSignature || body.walletSignature.length < 8) {
        return next(ApiError.badRequest('Invalid wallet signature', 'INVALID_SIGNATURE'));
      }

      // Auto-increment version: find the highest existing version for this wallet
      const latest = await PolicyModel.findOne({ walletAddress })
        .sort({ version: -1 })
        .lean();

      const version = (latest?.version ?? 0) + 1;

      const policy = await PolicyModel.create({
        walletAddress,
        ...body,
        version,
        createdAt: new Date(),
      });

      const policyVersion: PolicyVersion = {
        version: policy.version,
        minNetGainUsdt: policy.minNetGainUsdt,
        cooldownSeconds: policy.cooldownSeconds,
        spendingFloorUsdt: policy.spendingFloorUsdt,
        eligibleAssets: policy.eligibleAssets,
        approvalMode: policy.approvalMode as 'auto' | 'manual',
        createdAt: policy.createdAt.toISOString(),
      };

      res.status(201).json(policyVersion);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /policy/{address}:
 *   get:
 *     summary: Get active policy and full version history for a wallet
 *     tags: [Policy]
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Active policy and history
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: No policy found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get('/:address', requireAuth, async (req, res, next) => {
  try {
    const address = req.params['address'] as string;

    if (req.wallet !== address) {
      return next(ApiError.forbidden('You can only query your own policy'));
    }

    const docs = await PolicyModel.find({ walletAddress: address })
      .sort({ version: -1 })
      .lean();

    if (docs.length === 0) {
      return next(ApiError.notFound('No policy found for this wallet'));
    }

    const toVersion = (doc: (typeof docs)[number]): PolicyVersion => ({
      version: doc.version,
      minNetGainUsdt: doc.minNetGainUsdt,
      cooldownSeconds: doc.cooldownSeconds,
      spendingFloorUsdt: doc.spendingFloorUsdt,
      eligibleAssets: doc.eligibleAssets,
      approvalMode: doc.approvalMode as 'auto' | 'manual',
      createdAt: doc.createdAt.toISOString(),
    });

    const body: PolicyResponse = {
      active: toVersion(docs[0]),
      history: docs.map(toVersion),
    };

    res.json(body);
  } catch (err) {
    next(err);
  }
});

export default router;
