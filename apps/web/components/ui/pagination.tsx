import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
  /** 1-based page number currently shown. */
  page: number;
  /** Total number of pages. */
  totalPages?: number;
  /** Href for the previous page, or `undefined` to disable the control. */
  prevHref?: string;
  /** Href for the next page, or `undefined` to disable the control. */
  nextHref?: string;
  className?: string;
}

const linkClass =
  'inline-flex h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 text-sm font-medium text-white transition-colors hover:border-white/20 hover:bg-white/10';

const disabledClass =
  'inline-flex h-9 cursor-not-allowed items-center gap-1.5 rounded-full border border-white/5 bg-white/[0.02] px-4 text-sm font-medium text-muted-foreground/50';

/** Standard Previous/Next pagination control for offset-paginated lists. */
export function Pagination({ page, totalPages, prevHref, nextHref, className }: PaginationProps) {
  return (
    <nav
      aria-label="Pagination"
      className={cn('flex items-center justify-between gap-3 pt-2', className)}
    >
      {prevHref ? (
        <Link href={prevHref} className={linkClass} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Previous
        </Link>
      ) : (
        <span className={disabledClass} aria-disabled="true">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Previous
        </span>
      )}

      <span className="text-sm text-muted-foreground">
        Page {page}{totalPages ? `/${totalPages}` : ''}
      </span>

      {nextHref ? (
        <Link href={nextHref} className={linkClass} aria-label="Next page">
          Next
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      ) : (
        <span className={disabledClass} aria-disabled="true">
          Next
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </span>
      )}
    </nav>
  );
}
