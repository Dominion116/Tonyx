'use client';

import { usePathname } from 'next/navigation';
import { miniAppNavItems } from '@/components/layout/nav-items';
import { Button } from '@/components/ui/button';

/**
 * Compact top bar mirroring the dashboard's mobile header: the current screen
 * title and the wallet action, glassmorphic and sticky.
 */
export function MiniAppHeader() {
  const pathname = usePathname();

  const current =
    miniAppNavItems
      .filter(
        (i) => pathname === i.href || pathname.startsWith(`${i.href}/`)
      )
      .sort((a, b) => b.href.length - a.href.length)[0]?.name ?? 'Tonyx';

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-white/10 bg-black/80 px-4 backdrop-blur-xl">
      <h1 className="text-base font-semibold text-white">{current}</h1>
      <Button size="sm" className="ml-auto">
        Connect wallet
      </Button>
    </header>
  );
}
