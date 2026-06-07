'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Check,
  Loader2,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const ONBOARDED_KEY = 'tonyx_onboarded';
const TOTAL_STEPS = 4;

const minGainPresets = [5, 10, 25];

/** Mira asks a question; the control sits beneath it. */
function Question({
  question,
  children,
}: {
  question: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        </span>
        <p className="rounded-2xl rounded-tl-sm bg-white/5 px-3.5 py-2 text-sm text-white/90">
          {question}
        </p>
      </div>
      <div className="pl-9">{children}</div>
    </div>
  );
}

export function Onboarding() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [connected, setConnected] = useState(false);
  const [floor, setFloor] = useState(500);
  const [minGain, setMinGain] = useState(5);
  const [cooldown, setCooldown] = useState('6h');
  const [autoApprove, setAutoApprove] = useState(false);
  const [signing, setSigning] = useState(false);

  // Completed users skip straight to Home.
  useEffect(() => {
    if (localStorage.getItem(ONBOARDED_KEY) === 'true') {
      router.replace('/mini-app');
    }
  }, [router]);

  const finish = () => {
    setSigning(true);
    // Mock wallet signature + POST /api/policy.
    setTimeout(() => {
      localStorage.setItem(ONBOARDED_KEY, 'true');
      router.replace('/mini-app');
    }, 1500);
  };

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-5 py-6">
      {/* Brand + progress */}
      <div className="mb-8">
        <span className="text-lg font-bold text-white">Tonyx</span>
        <div className="mt-4 flex gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <span
              key={i}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors',
                i < step ? 'bg-accent' : 'bg-white/10'
              )}
            />
          ))}
        </div>
      </div>

      {/* Step 1: Wallet connection */}
      {step === 1 && (
        <div className="flex flex-1 flex-col">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Connect your wallet
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tonyx never takes custody. You approve every move and can disconnect
            any time.
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <Button
              size="lg"
              variant={connected ? 'outline' : 'default'}
              className="w-full"
              onClick={() => setConnected(true)}
            >
              {connected ? (
                <>
                  <Check className="h-5 w-5" aria-hidden="true" />
                  Wallet connected
                </>
              ) : (
                <>
                  <Wallet className="h-5 w-5" aria-hidden="true" />
                  Connect TON wallet
                </>
              )}
            </Button>
            <button className="text-sm text-muted-foreground transition-colors hover:text-white">
              Use an embedded wallet instead
            </button>
          </div>

          <div className="mt-auto pt-8">
            <Button
              size="lg"
              className="w-full"
              disabled={!connected}
              onClick={() => setStep(2)}
            >
              Continue
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Mira-guided policy Q&A */}
      {step === 2 && (
        <div className="flex flex-1 flex-col">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Set your policy
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A few questions so Tonyx knows your limits.
          </p>

          <div className="mt-6 space-y-6">
            <Question question="What's your spending floor? I'll always keep this much idle.">
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={5000}
                  step={50}
                  value={floor}
                  onChange={(e) => setFloor(Number(e.target.value))}
                  className="flex-1 accent-[#0098EA]"
                />
                <span className="w-20 text-right text-sm font-semibold text-white">
                  ${floor.toLocaleString()}
                </span>
              </div>
            </Question>

            <Question question="What minimum gain should trigger a rebalance?">
              <div className="flex flex-wrap gap-2">
                {minGainPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setMinGain(preset)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                      minGain === preset
                        ? 'border-accent/40 bg-accent/15 text-accent'
                        : 'border-white/10 text-white/70 hover:bg-white/5 hover:text-white'
                    )}
                  >
                    ${preset}
                  </button>
                ))}
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    $
                  </span>
                  <input
                    type="number"
                    value={minGain}
                    onChange={(e) => setMinGain(Number(e.target.value))}
                    className="h-9 w-24 rounded-full border border-white/10 bg-white/5 pl-6 pr-3 text-sm text-white focus:border-accent/40 focus:outline-none"
                  />
                </div>
              </div>
            </Question>

            <Question question="How often should I check for better pools?">
              <select
                value={cooldown}
                onChange={(e) => setCooldown(e.target.value)}
                className="h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white focus:border-accent/40 focus:outline-none"
              >
                <option value="1h">Every hour</option>
                <option value="6h">Every 6 hours</option>
                <option value="12h">Every 12 hours</option>
                <option value="24h">Once a day</option>
              </select>
            </Question>

            <Question question="Should I execute automatically or ask you first?">
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <span className="text-sm text-white">
                  {autoApprove ? 'Execute automatically' : 'Ask me first'}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoApprove}
                  onClick={() => setAutoApprove((v) => !v)}
                  className={cn(
                    'relative h-6 w-11 shrink-0 rounded-full transition-colors',
                    autoApprove ? 'bg-accent' : 'bg-white/15'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                      autoApprove ? 'translate-x-[22px]' : 'translate-x-0.5'
                    )}
                  />
                </button>
              </div>
            </Question>
          </div>

          <div className="mt-auto flex gap-3 pt-8">
            <Button variant="outline" size="lg" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button size="lg" className="flex-1" onClick={() => setStep(3)}>
              Review
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="flex flex-1 flex-col">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Review your policy
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You can change any of this later in Settings.
          </p>

          <dl className="mt-6 divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.03]">
            {[
              { label: 'Spending floor', value: `$${floor.toLocaleString()}` },
              { label: 'Minimum net gain', value: `$${minGain}` },
              {
                label: 'Check frequency',
                value:
                  cooldown === '1h'
                    ? 'Every hour'
                    : cooldown === '6h'
                      ? 'Every 6 hours'
                      : cooldown === '12h'
                        ? 'Every 12 hours'
                        : 'Once a day',
              },
              {
                label: 'Approval mode',
                value: autoApprove ? 'Automatic' : 'Ask first',
              },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between px-4 py-3"
              >
                <dt className="text-sm text-muted-foreground">{row.label}</dt>
                <dd className="text-sm font-medium text-white">{row.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-auto flex gap-3 pt-8">
            <Button variant="outline" size="lg" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button size="lg" className="flex-1" onClick={() => setStep(4)}>
              Looks good
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Signature */}
      {step === 4 && (
        <div className="flex flex-1 flex-col">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Sign to save
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Approve the signature in your wallet to store your policy. No funds
            move.
          </p>

          <div className="mt-auto pt-8">
            <Button
              size="lg"
              className="w-full"
              disabled={signing}
              onClick={finish}
            >
              {signing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  Waiting for signature...
                </>
              ) : (
                'Sign and finish'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
