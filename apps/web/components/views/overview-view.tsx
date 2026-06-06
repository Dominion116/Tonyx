import { Coins, Wallet, TrendingUp, Receipt } from 'lucide-react';
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

const metrics = [
  { label: 'Idle balance', value: '$4,820.00', icon: Wallet, change: '+2.4%', trend: 'up' as const },
  { label: 'Deployed balance', value: '$12,640.00', icon: Coins, change: '+5.1%', trend: 'up' as const },
  { label: 'Lifetime yield', value: '$1,284.52', icon: TrendingUp, change: '+11.0%', trend: 'up' as const },
  { label: 'x402 fees paid', value: '$38.17', icon: Receipt },
];

const positions = [
  { pool: 'TON / USDT', deposited: '$6,200.00', apr: '14.2%', status: 'Active' as const },
  { pool: 'USDT / NOT', deposited: '$3,940.00', apr: '11.8%', status: 'Active' as const },
  { pool: 'TON / STON', deposited: '$2,500.00', apr: '9.4%', status: 'Active' as const },
];

/** Portfolio overview, shared by the web dashboard and the Mini App home. */
export function OverviewView() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => (
          <StatCard key={m.label} {...m} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active positions</CardTitle>
          <Badge variant="accent">{positions.length} pools</Badge>
        </CardHeader>

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
              <TableRow key={p.pool}>
                <TableCell className="font-medium text-white">{p.pool}</TableCell>
                <TableCell>{p.deposited}</TableCell>
                <TableCell className="text-accent">{p.apr}</TableCell>
                <TableCell>
                  <Badge variant="success">{p.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
