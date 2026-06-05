import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { ApiError } from '../middleware/error.js';
import { fetchBalance } from '../services/tonapi.js';

const router = Router();

/**
 * @openapi
 * /balance/{address}:
 *   get:
 *     summary: Get wallet balance and LP positions
 *     tags: [Balance]
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema: { type: string }
 *         description: TON wallet address
 *     responses:
 *       200:
 *         description: Balance data (cached 30 s)
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Forbidden — can only query your own address
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get('/:address', requireAuth, async (req, res, next) => {
  try {
    const address = req.params['address'] as string;

    if (req.wallet !== address) {
      return next(ApiError.forbidden('You can only query your own balance'));
    }

    const balance = await fetchBalance(address);
    res.set('Cache-Control', 'private, max-age=30');
    res.json(balance);
  } catch (err) {
    next(err);
  }
});

export default router;
