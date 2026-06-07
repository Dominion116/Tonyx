import { ExternalLink } from 'lucide-react';
import type { RunStatus, RunSummary } from '@tonyx/shared';
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
import { getServerWalletAddress, serverApi } from '@/lib/server-api';

const statusVariant: Record<RunStatus, 'success' | 'warning' | 'error' | 'accent'> = {
  completed: 'success',
  skipped: 'warning',
  failed: 'error',
  executing: 'accent',
  pending: 'accent',
};

const statusLabel: Record<RunStatus, string> = {
  completed: 'Completed',
  skipped: 'Skipped',
  failed: 'Failed',
  executing: 'Executing',
  pending: 'Pending',
};

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtUsd(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function truncateTx(hash: string): string {
  return hash.length > 12 ? `${hash.slice(0, 6)}...${hash.slice(-4)}` : hash;
}

function RunRow({ run }: { run: RunSummary }) {
  return (
    <TableRow>
      <TableCell className="text-muted-foreground">{fmtTime(run.createdAt)}</TableCell>
      <TableCell>{run.originPool}</TableCell>
      <TableCell className="text-white">{run.destinationPool}</TableCell>
      <TableCell>{fmtUsd(run.routedAmountUsdt)}</TableCell>
      <TableCell className="text-emerald-400">+{fmtUsd(run.yieldEarnedUsdt)}</TableCell>
      <TableCell>{fmtUsd(run.x402FeeUsdt)}</TableCell>
      <TableCell>
        <Badge variant={statusVariant[run.status]}>{statusLabel[run.status]}</Badge>
      </TableCell>
      <TableCell className="text-right">
        {run.txHash ? (
          <a
            href={`https://tonviewer.com/transaction/${run.txHash}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-accent hover:underline"
          >
            {truncateTx(run.txHash)}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        ) : (
          <span className="text-muted-foreground">n/a</span>
        )}
      </TableCell>
    </TableRow>
  );
}

export default async function HistoryPage() {
  const address = await getServerWalletAddress();
  const data = address ? await serverApi.getRuns(address) : null;
  const runs = data?.runs ?? [];

  const completed = runs.filter((r) => r.status !== 'skipped');
  const skipped = runs.filter((r) => r.status === 'skipped');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Run history</CardTitle>
          <Badge variant="accent">{completed.length} runs</Badge>
        </CardHeader>

        {completed.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-muted-foreground">
            No runs yet. Approve a rebalance to see it here.
          </p>
        ) : (
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
              {completed.map((run) => (
                <RunRow key={run.id} run={run} />
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {skipped.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Skipped</CardTitle>
            <Badge variant="warning">{skipped.length}</Badge>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {skipped.map((run) => (
                <TableRow key={run.id}>
                  <TableCell className="text-muted-foreground">{fmtTime(run.createdAt)}</TableCell>
                  <TableCell>{run.originPool}</TableCell>
                  <TableCell className="text-white">{run.destinationPool}</TableCell>
                  <TableCell>{fmtUsd(run.routedAmountUsdt)}</TableCell>
                  <TableCell>
                    <Badge variant="warning">Dismissed</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
