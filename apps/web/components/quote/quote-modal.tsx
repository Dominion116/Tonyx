'use client';

import { useEffect, useRef, useState } from 'react';
import { useTonAddress } from '@tonconnect/ui-react';
import { ArrowRight, Check, Loader2, XCircle } from 'lucide-react';
import { buildAskMiraDeepLink } from '@tonyx/shared';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { ExplanationCard } from '@/components/ui/explanation-card';
import { ProposalCard, type Proposal } from '@/components/ui/proposal-card';
import { useToast } from '@/components/ui/toast';
import { api, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

export interface PoolTarget {
  pair: string;
  apr: string;
  netGain: string;
}

type Status =
  | 'quoting'
  | 'explanation'
  | 'error'
  | 'proposed'
  | 'signing'
  | 'executing'
  | 'completed'
  | 'failed';

const steps = ['Wallet signature', 'Execution'] as const;

function stepState(status: Status, index: number): 'done' | 'active' | 'pending' {
  const order: Status[] = ['signing', 'executing', 'completed'];
  const current = order.indexOf(status);
  if (status === 'completed') return 'done';
  if (current === -1) return 'pending';
  if (index < current) return 'done';
  if (index === current) return 'active';
  return 'pending';
}

function fmtSigned(n: number): string {
  return `${n >= 0 ? '+' : ''}$${n.toFixed(2)}`;
}

export function QuoteModal({
  open,
  onClose,
  pool,
  idleUsdt,
}: {
  open: boolean;
  onClose: () => void;
  pool: PoolTarget;
  idleUsdt: number;
}) {
  const { toast } = useToast();
  const walletAddress = useTonAddress();
  const [status, setStatus] = useState<Status>('quoting');
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [askMiraUrl, setAskMiraUrl] = useState<string | null>(null);
  const [approvalToken, setApprovalToken] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [explanation, setExplanation] = useState('');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  };

  const after = (ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  };

  // Request a Mira-evaluated quote each time the modal opens; reset on close.
  useEffect(() => {
    if (!open) {
      clearTimers();
      return;
    }

    setStatus('quoting');
    setProposal(null);
    setAskMiraUrl(null);
    setApprovalToken(null);
    setRunId(null);
    setErrorMessage('');
    setExplanation('');

    if (!walletAddress) {
      setErrorMessage('Connect your wallet to request a quote.');
      setStatus('error');
      return;
    }

    let cancelled = false;

    api
      .quote({ walletAddress, idleAmountUsdt: Math.max(idleUsdt, 1) })
      .then((data) => {
        if (cancelled) return;

        const mapped: Proposal = {
          origin: data.originPool,
          destination: data.destinationPool,
          estimatedYield: `${fmtSigned(data.estimatedYieldUsdt)}/day`,
          confidence: data.mira.confidence,
          explanation: data.mira.explanation,
        };

        if (data.mira.proceed && data.approvalToken) {
          setProposal(mapped);
          setApprovalToken(data.approvalToken);
          setAskMiraUrl(
            buildAskMiraDeepLink({
              originPool: data.originPool,
              destinationPool: data.destinationPool,
              routedAmountUsdt: data.routedAmountUsdt,
              aprPercent: parseFloat(pool.apr),
              estimatedYieldUsdt: data.estimatedYieldUsdt,
              confidence: data.mira.confidence,
              explanation: data.mira.explanation,
            }),
          );
          setStatus('proposed');
        } else {
          setExplanation(data.mira.explanation);
          setStatus('explanation');
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setErrorMessage(err instanceof ApiError ? err.message : 'Could not fetch a quote. Please try again.');
        setStatus('error');
      });

    return () => {
      cancelled = true;
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const approve = () => {
    setStatus('signing');
    after(900, () => execute());
  };

  const execute = () => {
    if (!approvalToken) return;
    setStatus('executing');

    api
      .execute(approvalToken)
      .then((res) => {
        setRunId(res.runId);
        pollTimer.current = setInterval(() => {
          api
            .getRunStatus(res.runId)
            .then((statusRes) => {
              if (statusRes.status === 'completed') {
                clearTimers();
                setStatus('completed');
                toast({
                  title: 'Rebalance complete',
                  description: `Into ${pool.pair}.${proposal ? ` Est. ${proposal.estimatedYield}.` : ''}`,
                });
              } else if (statusRes.status === 'failed') {
                clearTimers();
                setStatus('failed');
              }
            })
            .catch(() => {});
        }, 4_000);
      })
      .catch(() => {
        setStatus('failed');
      });
  };

  const isExecutionPhase =
    status === 'signing' ||
    status === 'executing' ||
    status === 'completed' ||
    status === 'failed';

  const title =
    status === 'quoting'
      ? 'Fetching quote'
      : status === 'explanation'
        ? 'No action recommended'
        : status === 'error'
          ? 'Quote unavailable'
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

      {status === 'error' && (
        <div className="space-y-4">
          <ExplanationCard reason={errorMessage} />
          <Button variant="outline" size="sm" className="w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      )}

      {status === 'explanation' && (
        <div className="space-y-4">
          <ExplanationCard reason={explanation} />
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
          askMiraUrl={askMiraUrl ?? undefined}
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

          {status === 'executing' && (
            <p className="text-sm text-muted-foreground">
              Submitting the route on TON and polling for confirmation
              {runId ? ` (run ${runId.slice(-6)})` : ''}...
            </p>
          )}

          {status === 'completed' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <Check className="h-4 w-4" aria-hidden="true" />
                Rebalanced into {proposal.destination}. Est. {proposal.estimatedYield}.
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
                Execution failed.
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={onClose}
              >
                Close
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
