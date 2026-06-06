import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Glassmorphic surface card matching the global theme: rounded-2xl, subtle
 * white border and translucent fill over the black background.
 */
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6',
      className
    )}
    {...props}
  />
));
Card.displayName = 'Card';

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('mb-4 flex items-center justify-between gap-3', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-lg font-semibold tracking-tight text-white', className)}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

export { Card, CardHeader, CardTitle };
