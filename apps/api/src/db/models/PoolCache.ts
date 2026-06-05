import { model, Schema } from 'mongoose';
import type { Pool } from '@tonyx/shared';

export interface PoolCacheDoc {
  _id: string;
  pools: Pool[];
  cachedAt: Date;
}

const schema = new Schema<PoolCacheDoc>(
  {
    _id: { type: String },
    pools: { type: Schema.Types.Mixed, required: true },
    cachedAt: { type: Date, required: true },
  },
  { _id: false },
);

export const PoolCacheModel = model<PoolCacheDoc>('PoolCache', schema, 'pool_cache');
