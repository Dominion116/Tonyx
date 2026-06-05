import { Router } from 'express';

const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check
 *     tags: [System]
 *     security: []
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: ok }
 *                 uptime: { type: number }
 */
router.get('/', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

export default router;
