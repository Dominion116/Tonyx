import { Coins, Wallet, TrendingUp } from 'lucide-react';
import type { BalanceResponse } from '@tonyx/shared';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function fmt(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface Props {
  balance?: BalanceResponse | null;
}

/** Portfolio overview, shared by the web dashboard and the Mini App home. */
export function OverviewView({ balance }: Props) {
  const idle = balance?.idleUsdt ?? 0;
  const deployed = balance?.deployedUsdt ?? 0;
  const lifetimeYield = balance?.lifetimeYieldUsdt ?? 0;
  const positions = balance?.lpPositions ?? [];

  const balanceMetrics = [
    { label: 'Idle balance', value: fmt(idle), icon: Wallet },
    { label: 'Deployed balance', value: fmt(deployed), icon: Coins },
  ];
  const yieldMetric = { label: 'Lifetime yield', value: fmt(lifetimeYield), icon: TrendingUp };

  return (
    <div className="space-y-6">
      <div className="flex w-full gap-4">
        {balanceMetrics.map((m) => (
          <StatCard key={m.label} className="min-w-0 flex-1" {...m} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard {...yieldMetric} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active positions</CardTitle>
          {positions.length > 0 && (
            <Badge variant="accent">{positions.length} pools</Badge>
          )}
        </CardHeader>

        {positions.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-muted-foreground">
            No active positions. Connect your wallet and run a rebalance to get started.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pool</TableHead>
                <TableHead>Deposited</TableHead>
                <TableHead>Current APR</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.map((p) => (
                <TableRow key={p.poolId}>
                  <TableCell className="font-medium text-white">{p.poolName}</TableCell>
                  <TableCell>{fmt(p.depositedUsdt)}</TableCell>
                  <TableCell className="text-accent">{p.currentAprPercent.toFixed(1)}%</TableCell>
                  <TableCell>
                    <Badge variant="success">Active</Badge>
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
