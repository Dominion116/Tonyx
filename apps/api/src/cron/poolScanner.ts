import cron from 'node-cron';
import { discoverPools } from '@tonyx/omniston';
import { PoolCacheModel } from '../db/index.js';

const CACHE_KEY = 'latest';

export async function refreshPoolCache(): Promise<void> {
  try {
    const pools = await discoverPools();
    await PoolCacheModel.findByIdAndUpdate(
      CACHE_KEY,
      { pools, cachedAt: new Date() },
      { upsert: true, new: true },
    );
    console.log(`[pool-scanner] Refreshed ${pools.length} pools`);
  } catch (err) {
    console.error('[pool-scanner] Refresh failed:', err);
  }
}

export function startPoolScanner(): void {
  // Run immediately on startup, then every 60 s
  void refreshPoolCache();
  cron.schedule('*/1 * * * *', () => void refreshPoolCache());
  console.log('[pool-scanner] Started (60 s interval)');
}

export async function getPoolsFromCache() {
  const doc = await PoolCacheModel.findById(CACHE_KEY).lean();
  return doc ?? null;
}
