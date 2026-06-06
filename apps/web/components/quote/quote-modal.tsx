'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Loader2, XCircle } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { ExplanationCard } from '@/components/ui/explanation-card';
import { ProposalCard, type Proposal } from '@/components/ui/proposal-card';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

export interface PoolTarget {
  pair: string;
  apr: string;
  netGain: string;
}

type QuoteResult =
  | { proceed: true; proposal: Proposal; approvalToken: string }
  | { proceed: false; reason: string };

type Status =
  | 'quoting'
  | 'explanation'
  | 'proposed'
  | 'signing'
  | 'payment'
  | 'executing'
  | 'completed'
  | 'failed';

function buildQuote(pool: PoolTarget): QuoteResult {
  const apr = parseFloat(pool.apr) || 0;
  const netNum = parseFloat(pool.netGain.replace(/[^0-9.]/g, '')) || 0;

  // Mock policy gate: thin edges do not clear the minimum net gain.
  if (apr < 12) {
    return {
      proceed: false,
      reason: `Moving into ${pool.pair} only nets ${pool.netGain} per week, which falls below your $5 minimum once the x402 fee and slippage are counted. I will keep watching and surface it when the edge is bigger.`,
    };
  }

  return {
    proceed: true,
    approvalToken: `tok_${Math.random().toString(36).slice(2, 10)}`,
    proposal: {
      origin: 'Idle USDT',
      destination: pool.pair,
      estimatedYield: `+$${(netNum + 0.5).toFixed(2)}/wk`,
      x402Fee: '$0.50',
      netGain: `+$${netNum.toFixed(2)}/wk`,
      confidence: Math.min(0.6 + (apr - 10) / 35, 0.97),
      explanation:
        'Net gain clears your $5 minimum after swap fees and slippage, and the move stays within your eligible assets and spending floor.',
    },
  };
}

const steps = ['Wallet signature', 'x402 payment', 'Execution'] as const;

function stepState(status: Status, index: number): 'done' | 'active' | 'pending' {
  const order: Status[] = ['signing', 'payment', 'executing', 'completed'];
  const current = order.indexOf(status);
  if (status === 'completed') return 'done';
  if (current === -1) return 'pending';
  if (index < current) return 'done';
  if (index === current) return 'active';
  return 'pending';
}

export function QuoteModal({
  open,
  onClose,
  pool,
}: {
  open: boolean;
  onClose: () => void;
  pool: PoolTarget;
}) {
  const { toast } = useToast();
  const [status, setStatus] = useState<Status>('quoting');
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };

  const after = (ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  };

  // Run the quote each time the modal opens; reset on close.
  useEffect(() => {
    if (!open) {
      clearTimers();
      return;
    }
    setStatus('quoting');
    setQuote(null);
    after(900, () => {
      const result = buildQuote(pool);
      setQuote(result);
      setStatus(result.proceed ? 'proposed' : 'explanation');
    });
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const approve = () => {
    // Wallet signature, then execute returns HTTP 402 -> prompt payment.
    setStatus('signing');
    after(1100, () => setStatus('payment'));
  };

  const pay = () => {
    setStatus('executing');
    after(1700, () => {
      setStatus('completed');
      toast({
        title: 'Rebalance complete',
        description: `Into ${pool.pair}. Earned ${
          quote && quote.proceed ? quote.proposal.netGain : ''
        }, fee $0.50.`,
      });
    });
  };

  const proposal = quote && quote.proceed ? quote.proposal : null;
  const isExecutionPhase =
    status === 'signing' ||
    status === 'payment' ||
    status === 'executing' ||
    status === 'completed' ||
    status === 'failed';

  const title =
    status === 'quoting'
      ? 'Fetching quote'
      : status === 'explanation'
        ? 'No action recommended'
        : status === 'proposed'
          ? 'Review proposal'
          : status === 'completed'
            ? 'Rebalance complete'
            : 'Executing rebalance';

  return (
    <Modal open={open} onClose={onClose} title={title}>
      {status === 'quoting' && (
        <div className="flex items-center gap-3 py-6 text-sm text-white/80">
          <Loader2 className="h-5 w-5 animate-spin text-accent" aria-hidden="true" />
          Scanning routes and checking your policy...
        </div>
      )}

      {status === 'explanation' && quote && !quote.proceed && (
        <div className="space-y-4">
          <ExplanationCard reason={quote.reason} />
          <Button variant="outline" size="sm" className="w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      )}

      {status === 'proposed' && proposal && (
        <ProposalCard
          proposal={proposal}
          status="proposed"
          onApprove={approve}
          onDismiss={onClose}
        />
      )}

      {isExecutionPhase && proposal && (
        <div className="space-y-4">
          {/* Route summary */}
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <span className="rounded-md bg-white/5 px-2 py-1">{proposal.origin}</span>
            <ArrowRight className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            <span className="rounded-md bg-accent/15 px-2 py-1 text-accent">
              {proposal.destination}
            </span>
          </div>

          {/* Stepper */}
          <ol className="space-y-2">
            {steps.map((label, i) => {
              const state = stepState(status, i);
              return (
                <li key={label} className="flex items-center gap-3 text-sm">
                  <span
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full border',
                      state === 'done' && 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400',
                      state === 'active' && 'border-accent/40 bg-accent/15 text-accent',
                      state === 'pending' && 'border-white/10 text-white/40'
                    )}
                  >
                    {state === 'done' ? (
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : state === 'active' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    )}
                  </span>
                  <span
                    className={cn(
                      state === 'pending' ? 'text-muted-foreground' : 'text-white'
                    )}
                  >
                    {label}
                  </span>
                </li>
              );
            })}
          </ol>

          {/* Phase controls */}
          {status === 'signing' && (
            <p className="text-sm text-muted-foreground">
              Confirm the signature request in your wallet...
            </p>
          )}

          {status === 'payment' && (
            <div className="rounded-lg border border-accent/20 bg-accent/[0.06] p-3">
              <p className="text-sm text-white">
                An x402 micropayment of{' '}
                <span className="font-semibold text-accent">$0.50</span> is required
                to execute this route.
              </p>
              <Button size="sm" className="mt-3 w-full" onClick={pay}>
                Pay $0.50 and execute
              </Button>
            </div>
          )}

          {status === 'executing' && (
            <p className="text-sm text-muted-foreground">
              Submitting the route on TON and polling for confirmation...
            </p>
          )}

          {status === 'completed' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <Check className="h-4 w-4" aria-hidden="true" />
                Rebalanced. Earned {proposal.netGain}, fee $0.50.
              </div>
              <Button size="sm" className="w-full" onClick={onClose}>
                Done
              </Button>
            </div>
          )}

          {status === 'failed' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-red-400">
                <XCircle className="h-4 w-4" aria-hidden="true" />
                Execution failed. No fee was charged.
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => setStatus('payment')}
              >
                Retry
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
