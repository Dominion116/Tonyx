import { ExternalLink } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type Status = 'Completed' | 'Skipped' | 'Failed';

const runs: {
  time: string;
  from: string;
  to: string;
  amount: string;
  yield: string;
  fee: string;
  status: Status;
  tx?: string;
}[] = [
  { time: 'Jun 6, 14:02', from: 'TON / STON', to: 'TON / USDT', amount: '$2,500', yield: '+$18.40', fee: '$0.50', status: 'Completed', tx: 'EQAbc...9f2' },
  { time: 'Jun 6, 08:31', from: 'Idle USDT', to: 'USDT / NOT', amount: '$3,940', yield: '+$31.10', fee: '$0.50', status: 'Completed', tx: 'EQDxy...7c1' },
  { time: 'Jun 5, 21:19', from: 'TON / USDT', to: 'USDT / USDe', amount: '$1,200', yield: '+$0.00', fee: '$0.00', status: 'Skipped' },
  { time: 'Jun 5, 11:48', from: 'Idle USDT', to: 'TON / jUSDT', amount: '$800', yield: '+$0.00', fee: '$0.50', status: 'Failed' },
];

const statusVariant: Record<Status, 'success' | 'warning' | 'error'> = {
  Completed: 'success',
  Skipped: 'warning',
  Failed: 'error',
};

export default function HistoryPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Run history</CardTitle>
          <Badge variant="accent">{runs.length} runs</Badge>
        </CardHeader>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Yield</TableHead>
              <TableHead>Fee</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Tx</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((run, i) => (
              <TableRow key={i}>
                <TableCell className="text-muted-foreground">{run.time}</TableCell>
                <TableCell>{run.from}</TableCell>
                <TableCell className="text-white">{run.to}</TableCell>
                <TableCell>{run.amount}</TableCell>
                <TableCell className="text-emerald-400">{run.yield}</TableCell>
                <TableCell>{run.fee}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[run.status]}>{run.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {run.tx ? (
                    <a
                      href={`https://tonviewer.com/transaction/${run.tx}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-accent hover:underline"
                    >
                      {run.tx}
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground">n/a</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
