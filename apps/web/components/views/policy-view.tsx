'use client';

import { useEffect, useState } from 'react';
import { useTonAddress } from '@tonconnect/ui-react';
import type { ApprovalMode } from '@tonyx/shared';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { api, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

const assetOptions = ['TON', 'USDT', 'NOT', 'STON', 'jUSDT', 'USDe'];

const cooldownOptions = [
  { value: 3600, label: '1 hour' },
  { value: 21600, label: '6 hours' },
  { value: 43200, label: '12 hours' },
  { value: 86400, label: '24 hours' },
];

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-white">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

const inputClass =
  'h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-muted-foreground focus:border-accent/40 focus:outline-none focus:ring-2 focus:ring-accent/20';

/** Loading placeholder mirroring the policy form's layout while it fetches. */
function PolicyFormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <div className="flex flex-wrap gap-2 pt-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-16 rounded-full" />
          ))}
        </div>
      </div>

      <Skeleton className="h-[68px] w-full rounded-lg" />
      <Skeleton className="h-12 w-full rounded-full" />
    </div>
  );
}

/** Policy manager, shared by the web dashboard and the Mini App settings. */
export function PolicyView() {
  const { toast } = useToast();
  const walletAddress = useTonAddress();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [minNetGain, setMinNetGain] = useState(5);
  const [spendingFloor, setSpendingFloor] = useState(500);
  const [cooldownSeconds, setCooldownSeconds] = useState(21600);
  const [assets, setAssets] = useState<string[]>(['TON', 'USDT']);
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>('manual');

  useEffect(() => {
    if (!walletAddress) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    api
      .getPolicy(walletAddress)
      .then((data) => {
        if (cancelled) return;
        const active = data.active;
        setMinNetGain(active.minNetGainUsdt);
        setSpendingFloor(active.spendingFloorUsdt);
        setCooldownSeconds(active.cooldownSeconds);
        setAssets(active.eligibleAssets);
        setApprovalMode(active.approvalMode);
      })
      .catch(() => {
        // No saved policy yet — keep the defaults.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [walletAddress]);

  const toggleAsset = (asset: string) =>
    setAssets((prev) =>
      prev.includes(asset)
        ? prev.filter((a) => a !== asset)
        : [...prev, asset]
    );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!walletAddress) {
      toast({ title: 'Connect your wallet', description: 'A connected wallet is required to save a policy.' });
      return;
    }
    if (assets.length === 0) {
      toast({ title: 'Pick at least one asset', description: 'Eligible assets cannot be empty.' });
      return;
    }

    setSaving(true);
    try {
      await api.savePolicy({
        minNetGainUsdt: minNetGain,
        cooldownSeconds,
        spendingFloorUsdt: spendingFloor,
        eligibleAssets: assets,
        approvalMode,
        walletSignature: `dev-sig-${walletAddress}-${Date.now()}`,
      });
      toast({ title: 'Policy saved', description: 'Tonyx will use these guardrails for future rebalances.' });
    } catch (err) {
      toast({
        title: 'Could not save policy',
        description: err instanceof ApiError ? err.message : 'Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Policy</CardTitle>
        </CardHeader>
        <p className="mb-6 text-sm text-muted-foreground">
          Set the guardrails once. Tonyx never crosses them.
        </p>

        {!walletAddress ? (
          <p className="text-sm text-muted-foreground">Connect your wallet to view and edit your policy.</p>
        ) : loading ? (
          <PolicyFormSkeleton />
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Minimum net gain" hint="Smallest profit that triggers a rebalance.">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    $
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={minNetGain}
                    onChange={(e) => setMinNetGain(Number(e.target.value))}
                    className={cn(inputClass, 'pl-7')}
                  />
                </div>
              </Field>

              <Field label="Spending floor" hint="Balance kept idle and untouched.">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    $
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={spendingFloor}
                    onChange={(e) => setSpendingFloor(Number(e.target.value))}
                    className={cn(inputClass, 'pl-7')}
                  />
                </div>
              </Field>

              <Field label="Cooldown period" hint="Minimum time between moves.">
                <select
                  className={inputClass}
                  value={cooldownSeconds}
                  onChange={(e) => setCooldownSeconds(Number(e.target.value))}
                >
                  {cooldownOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Eligible assets" hint="Only these assets may be deployed.">
              <div className="flex flex-wrap gap-2 pt-1">
                {assetOptions.map((asset) => {
                  const active = assets.includes(asset);
                  return (
                    <button
                      key={asset}
                      type="button"
                      onClick={() => toggleAsset(asset)}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                        active
                          ? 'border-accent/40 bg-accent/15 text-accent'
                          : 'border-white/10 text-white/70 hover:bg-white/5 hover:text-white'
                      )}
                    >
                      {asset}
                    </button>
                  );
                })}
              </div>
            </Field>

            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] p-4">
              <div>
                <p className="text-sm font-medium text-white">Auto-approve</p>
                <p className="text-xs text-muted-foreground">
                  Execute qualifying rebalances without asking.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={approvalMode === 'auto'}
                onClick={() => setApprovalMode((v) => (v === 'auto' ? 'manual' : 'auto'))}
                className={cn(
                  'relative h-6 w-11 shrink-0 rounded-full transition-colors',
                  approvalMode === 'auto' ? 'bg-accent' : 'bg-white/15'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                    approvalMode === 'auto' ? 'translate-x-[22px]' : 'translate-x-0.5'
                  )}
                />
              </button>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={saving}>
              {saving ? 'Saving...' : 'Save policy'}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
