import { Router } from 'express';
import { NotificationUpdateSchema, type Notification } from '@tonyx/shared';
import { NotificationModel } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { ApiError } from '../middleware/error.js';
import { validate } from '../middleware/validate.js';

const router = Router();

/**
 * @openapi
 * /notifications/{address}:
 *   put:
 *     summary: Upsert notification preferences for a wallet
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               telegramUserId: { type: string }
 *               minGainAlertUsdt: { type: number, minimum: 0 }
 *               quietHoursStart: { type: integer, minimum: 0, maximum: 23 }
 *               quietHoursEnd: { type: integer, minimum: 0, maximum: 23 }
 *               alertFrequency:
 *                 type: string
 *                 enum: [immediate, hourly, daily]
 *     responses:
 *       200:
 *         description: Notification preferences saved
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
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.put(
  '/:address',
  requireAuth,
  validate(NotificationUpdateSchema),
  async (req, res, next) => {
    try {
      const address = req.params['address'] as string;

      if (req.wallet !== address) {
        return next(ApiError.forbidden('You can only update your own notification preferences'));
      }

      const updates = req.body as Partial<Omit<Notification, 'walletAddress' | 'updatedAt'>>;

      const doc = await NotificationModel.findOneAndUpdate(
        { walletAddress: address },
        { $set: { ...updates, updatedAt: new Date() } },
        { upsert: true, new: true },
      ).lean();

      res.json({
        walletAddress: doc.walletAddress,
        telegramUserId: doc.telegramUserId,
        minGainAlertUsdt: doc.minGainAlertUsdt,
        quietHoursStart: doc.quietHoursStart,
        quietHoursEnd: doc.quietHoursEnd,
        alertFrequency: doc.alertFrequency,
        updatedAt: doc.updatedAt.toISOString(),
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
