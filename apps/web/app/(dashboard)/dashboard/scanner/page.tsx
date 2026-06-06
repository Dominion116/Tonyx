import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RebalanceButton } from '@/components/quote/rebalance-button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const pools = [
  { pair: 'TON / USDT', apr: '18.4%', liquidity: '$4.2M', netGain: '+$62.40', crosschain: false },
  { pair: 'USDT / USDe', apr: '16.1%', liquidity: '$2.8M', netGain: '+$48.10', crosschain: true },
  { pair: 'TON / NOT', apr: '14.7%', liquidity: '$1.9M', netGain: '+$39.85', crosschain: false },
  { pair: 'STON / USDT', apr: '12.3%', liquidity: '$1.1M', netGain: '+$24.60', crosschain: false },
  { pair: 'TON / jUSDT', apr: '10.9%', liquidity: '$880K', netGain: '+$18.20', crosschain: true },
];

export default function ScannerPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Yield scanner</CardTitle>
          <Badge variant="accent">Updated 12s ago</Badge>
        </CardHeader>
        <p className="mb-4 text-sm text-muted-foreground">
          Ranked by real net gain on your idle balance after swap fees, gas, and
          slippage.
        </p>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pool</TableHead>
              <TableHead>APR</TableHead>
              <TableHead>Liquidity</TableHead>
              <TableHead>Est. net gain</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pools.map((pool) => (
              <TableRow key={pool.pair}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{pool.pair}</span>
                    {pool.crosschain && (
                      <Badge variant="outline" className="text-[10px]">
                        Crosschain
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-accent">{pool.apr}</TableCell>
                <TableCell>{pool.liquidity}</TableCell>
                <TableCell className="text-emerald-400">{pool.netGain}</TableCell>
                <TableCell className="text-right">
                  <RebalanceButton
                    pool={{ pair: pool.pair, apr: pool.apr, netGain: pool.netGain }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
