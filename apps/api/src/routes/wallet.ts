import { Router } from 'express';
import { WalletConnectRequestSchema, type WalletConnectResponse } from '@tonyx/shared';
import { UserModel } from '../db/index.js';
import { signSessionToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

/**
 * @openapi
 * /wallet/connect:
 *   post:
 *     summary: Connect a wallet and obtain a session token
 *     tags: [Wallet]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [walletAddress]
 *             properties:
 *               walletAddress:
 *                 type: string
 *                 example: EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t
 *     responses:
 *       200:
 *         description: Session token issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessionToken: { type: string }
 *                 walletAddress: { type: string }
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post(
  '/connect',
  validate(WalletConnectRequestSchema),
  async (req, res, next) => {
    try {
      const { walletAddress } = req.body as { walletAddress: string };

      // Best-effort upsert — JWT is issued regardless of DB state
      UserModel.findOneAndUpdate(
        { walletAddress },
        { $setOnInsert: { walletAddress } },
        { upsert: true, new: true },
      ).catch((err: unknown) => {
        console.warn('[wallet/connect] DB upsert failed (non-fatal):', (err as Error).message);
      });

      const sessionToken = signSessionToken(walletAddress);

      const body: WalletConnectResponse = { sessionToken, walletAddress };
      res.json(body);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
