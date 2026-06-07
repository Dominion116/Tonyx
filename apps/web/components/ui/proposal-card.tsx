import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface Proposal {
  origin: string;
  destination: string;
  estimatedYield: string;
  x402Fee: string;
  netGain: string;
  /** 0-1 confidence from Mira. */
  confidence: number;
  explanation: string;
}

export type ProposalStatus =
  | 'proposed'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'dismissed';

interface ProposalCardProps {
  proposal: Proposal;
  status?: ProposalStatus;
  /** Result line shown on completed/failed, e.g. tx summary. */
  resultText?: string;
  onApprove?: () => void;
  onDismiss?: () => void;
  /** Telegram deep link that hands this proposal to @mira for a second opinion. */
  askMiraUrl?: string;
  className?: string;
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={cn('mt-1 text-sm font-semibold', accent ? 'text-emerald-400' : 'text-white')}>
        {value}
      </p>
    </div>
  );
}

/**
 * Shared proposal surface used by the chat panel and the quote/execute flow.
 * Shows the route, economics, Mira confidence, and an action footer that
 * reflects the live execution status.
 */
export function ProposalCard({
  proposal,
  status = 'proposed',
  resultText,
  onApprove,
  onDismiss,
  askMiraUrl,
  className,
}: ProposalCardProps) {
  const confidencePct = Math.round(proposal.confidence * 100);

  return (
    <div
      className={cn(
        'rounded-xl border border-accent/20 bg-white/[0.03] p-4',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-white">Rebalance proposal</p>
        <Badge variant="accent">{confidencePct}% confidence</Badge>
      </div>

      <div className="mt-3 flex items-center gap-2 text-sm font-medium text-white">
        <span className="rounded-md bg-white/5 px-2 py-1">{proposal.origin}</span>
        <ArrowRight className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
        <span className="rounded-md bg-accent/15 px-2 py-1 text-accent">
          {proposal.destination}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat label="Est. yield" value={proposal.estimatedYield} accent />
        <Stat label="x402 fee" value={proposal.x402Fee} />
        <Stat label="Net gain" value={proposal.netGain} accent />
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {proposal.explanation}
      </p>

      <div className="mt-4">
        {status === 'proposed' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Button size="sm" className="flex-1" onClick={onApprove}>
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={onDismiss}
              >
                Dismiss
              </Button>
            </div>
            {askMiraUrl && (
              <Button asChild size="sm" variant="outline" className="w-full gap-1.5">
                <a href={askMiraUrl} target="_blank" rel="noopener noreferrer">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  Ask Mira for a second opinion
                </a>
              </Button>
            )}
          </div>
        )}

        {status === 'executing' && (
          <div className="flex items-center gap-2 text-sm text-white/80">
            <Loader2 className="h-4 w-4 animate-spin text-accent" aria-hidden="true" />
            Executing rebalance...
          </div>
        )}

        {status === 'completed' && (
          <div className="flex items-center gap-2 text-sm text-emerald-400">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {resultText ?? 'Rebalance completed.'}
          </div>
        )}

        {status === 'failed' && (
          <div className="flex items-center gap-2 text-sm text-red-400">
            <XCircle className="h-4 w-4" aria-hidden="true" />
            {resultText ?? 'Rebalance failed.'}
          </div>
        )}

        {status === 'dismissed' && (
          <p className="text-sm text-muted-foreground">Dismissed.</p>
        )}
      </div>
    </div>
  );
}
