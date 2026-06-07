import { Router } from 'express';
import { discoverPools, discoverCrosschainPools } from '@tonyx/omniston';
import type { PoolsResponse } from '@tonyx/shared';
import { getPoolsFromCache } from '../cron/poolScanner.js';
import { TtlCache } from '../services/cache.js';

const router = Router();

// In-process cache: avoids hammering MongoDB on every request between cron ticks
const inMemoryCache = new TtlCache<PoolsResponse>(60_000);
const CACHE_KEY = 'pools';

/**
 * @openapi
 * /pools:
 *   get:
 *     summary: Get ranked pool list
 *     tags: [Pools]
 *     security: []
 *     responses:
 *       200:
 *         description: Pool list sorted by APR descending (cached 60 s)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 pools:
 *                   type: array
 *                   items:
 *                     type: object
 *                 cachedAt:
 *                   type: string
 *                   format: date-time
 */
router.get('/', async (_req, res, next) => {
  try {
    const mem = inMemoryCache.get(CACHE_KEY);
    if (mem) {
      res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');
      return res.json(mem);
    }

    // Try MongoDB cache first (populated by cron)
    const dbCache = await getPoolsFromCache().catch(() => null);

    let pools;
    let cachedAt: string;

    if (dbCache) {
      pools = dbCache.pools;
      cachedAt = (dbCache.cachedAt as Date).toISOString();
    } else {
      // Cold start or DB unavailable — fetch live
      const [nativePools, crosschainPools] = await Promise.all([
        discoverPools(),
        discoverCrosschainPools(),
      ]);
      pools = [...nativePools, ...crosschainPools];
      cachedAt = new Date().toISOString();
    }

    const body: PoolsResponse = { pools, cachedAt };
    inMemoryCache.set(CACHE_KEY, body);
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');
    res.json(body);
  } catch (err) {
    next(err);
  }
});

export default router;
