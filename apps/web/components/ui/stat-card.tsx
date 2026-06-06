import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  /** Optional delta shown as a pill, e.g. "+11.01%". */
  change?: string;
  trend?: 'up' | 'down';
}

/**
 * Metric tile adapted from the admin template: an accent icon badge, a label,
 * a large value, and an optional up/down change pill.
 */
export function StatCard({ label, value, icon: Icon, change, trend }: StatCardProps) {
  return (
    <Card>
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/20">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>

      <div className="mt-5 flex items-end justify-between">
        <div>
          <span className="text-sm text-muted-foreground">{label}</span>
          <h4 className="mt-2 text-2xl font-bold tracking-tight text-white">
            {value}
          </h4>
        </div>

        {change && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
              trend === 'down'
                ? 'bg-red-500/10 text-red-400'
                : 'bg-emerald-500/10 text-emerald-400'
            )}
          >
            {trend === 'down' ? (
              <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {change}
          </span>
        )}
      </div>
    </Card>
  );
}
