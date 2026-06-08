import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Shared quote-status card for either a Mira refusal or a non-advisory error.
 */
export function ExplanationCard({
  reason,
  title = 'Mira recommends holding',
  className,
}: {
  reason: string;
  title?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-white/10 bg-white/[0.03] p-4',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-white/70">
          <Info className="h-4 w-4" aria-hidden="true" />
        </span>
        <p className="text-sm font-semibold text-white">{title}</p>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{reason}</p>
    </div>
  );
}
