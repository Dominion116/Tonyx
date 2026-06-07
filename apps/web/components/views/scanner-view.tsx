import type { Pool } from '@tonyx/shared';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RebalanceButton } from '@/components/quote/rebalance-button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function fmtLiquidity(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function estimateNetGain(pool: Pool, idleUsdt: number): string {
  const dailyYield = (idleUsdt * pool.aprPercent) / 100 / 365;
  const net = dailyYield - (pool.estimatedBridgeCostUsdt ?? 0);
  const sign = net >= 0 ? '+' : '';
  return `${sign}$${net.toFixed(2)}/day`;
}

interface Props {
  pools?: Pool[] | null;
  cachedAt?: string | null;
  idleUsdt?: number;
}

/** Yield scanner table, shared by the web dashboard and the Mini App. */
export function ScannerView({ pools, cachedAt, idleUsdt = 0 }: Props) {
  const poolList = (pools ?? [])
    .filter((p) => p.liquidityUsdt >= 100_000 && p.aprPercent > 0 && p.aprPercent < 500_000)
    .sort((a, b) => b.aprPercent - a.aprPercent)
    .slice(0, 20);

  const ageLabel = cachedAt
    ? `Updated ${Math.round((Date.now() - new Date(cachedAt).getTime()) / 1000)}s ago`
    : 'Fetching pools...';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Yield scanner</CardTitle>
          <Badge variant="accent">{ageLabel}</Badge>
        </CardHeader>
        <p className="mb-4 text-sm text-muted-foreground">
          Ranked by real net gain on your idle balance after swap fees, gas, and slippage.
        </p>

        {poolList.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-muted-foreground">
            No pools loaded yet. The scanner refreshes every 60 s.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pool</TableHead>
                <TableHead>APR</TableHead>
                <TableHead>Liquidity</TableHead>
                <TableHead>Est. net gain/day</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {poolList.map((pool) => (
                <TableRow key={pool.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{pool.name}</span>
                      {pool.isCrosschain && (
                        <Badge variant="outline" className="text-[10px]">
                          Crosschain
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-accent">{pool.aprPercent.toFixed(1)}%</TableCell>
                  <TableCell>{fmtLiquidity(pool.liquidityUsdt)}</TableCell>
                  <TableCell className="text-emerald-400">
                    {estimateNetGain(pool, idleUsdt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <RebalanceButton
                      pool={{ pair: pool.assetPair, apr: `${pool.aprPercent.toFixed(1)}%`, netGain: estimateNetGain(pool, idleUsdt) }}
                      idleUsdt={idleUsdt}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

/** Loading placeholder mirroring `ScannerView`'s layout. */
export function ScannerSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-5 w-28 rounded-full" />
        </CardHeader>
        <Skeleton className="mb-4 h-4 w-3/4" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="ml-auto h-9 w-24 rounded-full" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
