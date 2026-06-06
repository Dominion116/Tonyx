'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const assetOptions = ['TON', 'USDT', 'NOT', 'STON', 'jUSDT', 'USDe'];

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

export default function PolicyPage() {
  const [assets, setAssets] = useState<string[]>(['TON', 'USDT']);
  const [autoApprove, setAutoApprove] = useState(false);

  const toggleAsset = (asset: string) =>
    setAssets((prev) =>
      prev.includes(asset)
        ? prev.filter((a) => a !== asset)
        : [...prev, asset]
    );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Policy</CardTitle>
        </CardHeader>
        <p className="mb-6 text-sm text-muted-foreground">
          Set the guardrails once. Tonyx never crosses them.
        </p>

        <form className="space-y-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Minimum net gain" hint="Smallest profit that triggers a rebalance.">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <input type="number" defaultValue={5} className={cn(inputClass, 'pl-7')} />
              </div>
            </Field>

            <Field label="Spending floor" hint="Balance kept idle and untouched.">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <input type="number" defaultValue={500} className={cn(inputClass, 'pl-7')} />
              </div>
            </Field>

            <Field label="Cooldown period" hint="Minimum time between moves.">
              <select className={inputClass} defaultValue="6h">
                <option value="1h">1 hour</option>
                <option value="6h">6 hours</option>
                <option value="12h">12 hours</option>
                <option value="24h">24 hours</option>
              </select>
            </Field>

            <Field label="Max slippage" hint="Reject routes above this slippage.">
              <div className="relative">
                <input type="number" defaultValue={0.5} step={0.1} className={cn(inputClass, 'pr-8')} />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  %
                </span>
              </div>
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

          <Button type="submit" size="lg" className="w-full">
            Save policy
          </Button>
        </form>
      </Card>
    </div>
  );
}
