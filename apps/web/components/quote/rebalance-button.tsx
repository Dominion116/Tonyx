'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { QuoteModal, type PoolTarget } from '@/components/quote/quote-modal';

/**
 * Opens the quote/execute flow for a pool. Used by the scanner rows so the
 * page itself can stay a server component.
 */
export function RebalanceButton({ pool, idleUsdt }: { pool: PoolTarget; idleUsdt: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Rebalance now
      </Button>
      <QuoteModal open={open} onClose={() => setOpen(false)} pool={pool} idleUsdt={idleUsdt} />
    </>
  );
}
