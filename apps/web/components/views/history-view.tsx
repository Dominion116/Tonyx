import { ExternalLink } from 'lucide-react';
import type { RunStatus, RunSummary } from '@tonyx/shared';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const statusVariant: Record<RunStatus, 'success' | 'warning' | 'error' | 'accent'> = {
  completed: 'success',
  skipped: 'warning',
  failed: 'error',
  executing: 'accent',
  pending: 'accent',
  stuck: 'warning',
};

const statusLabel: Record<RunStatus, string> = {
  completed: 'Completed',
  skipped: 'Skipped',
  failed: 'Failed',
  executing: 'Executing',
  pending: 'Pending',
  stuck: 'Stuck',
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

function fmtSignedUsd(n: number): string {
  return `${n >= 0 ? '+' : '-'}${fmtUsd(Math.abs(n))}`;
}

function truncateTx(hash: string): string {
  return hash.length > 12 ? `${hash.slice(0, 6)}...${hash.slice(-4)}` : hash;
}

function RunRow({ run }: { run: RunSummary }) {
  return (
    <TableRow>
      <TableCell className="text-muted-foreground">{fmtTime(run.createdAt)}</TableCell>
      <TableCell>{run.originPool}</TableCell>
      <TableCell className="text-white">
        <div className="flex flex-col gap-1">
          <span>{run.destinationPool}</span>
          {run.isCrosschain && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-[10px]">
                {run.destinationChain ?? 'crosschain'}
              </Badge>
              {run.bridgeCostUsdt !== undefined && (
                <span>bridge {fmtUsd(run.bridgeCostUsdt)}</span>
              )}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell>{fmtUsd(run.routedAmountUsdt)}</TableCell>
      <TableCell className={run.yieldEarnedUsdt >= 0 ? 'text-emerald-400' : 'text-red-400'}>
        {fmtSignedUsd(run.yieldEarnedUsdt)}
      </TableCell>
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

interface Props {
  runs: RunSummary[];
  /** 1-based page number currently shown. */
  page?: number;
  prevHref?: string;
  nextHref?: string;
}

/** Run history, shared by the web dashboard and the Mini App history screen. */
export function HistoryView({ runs, page = 1, prevHref, nextHref }: Props) {
  const completed = runs.filter((r) => r.status !== 'skipped');
  const skipped = runs.filter((r) => r.status === 'skipped');
  const showPagination = Boolean(prevHref || nextHref);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Run history</CardTitle>
          <Badge variant="accent">{completed.length} active runs</Badge>
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

      {showPagination && <Pagination page={page} prevHref={prevHref} nextHref={nextHref} />}
    </div>
  );
}

/** Loading placeholder mirroring `HistoryView`'s layout. */
export function HistorySkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </CardHeader>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="ml-auto h-5 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>
    </div>
  );
}
