'use client';

import { PanelLeft, Search } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { navItems } from '@/components/layout/nav-items';
import { useSidebar } from '@/components/layout/sidebar-context';
import { WalletButton } from '@/components/wallet/wallet-button';

/**
 * Sticky top bar adapted from the admin template: sidebar toggles, a search
 * field, and the wallet action. Glassmorphic to match the global theme.
 */
export function DashboardHeader() {
  const pathname = usePathname();
  const { toggleExpanded } = useSidebar();

  const current =
    navItems.find(
      (item) =>
        pathname === item.href || pathname.startsWith(`${item.href}/`)
    )?.name ?? 'Dashboard';

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-white/10 bg-black/80 px-4 backdrop-blur-xl lg:px-6">
      {/* Collapse toggle (desktop) */}
      <button
        onClick={toggleExpanded}
        aria-label="Toggle sidebar"
        className="hidden h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-white/70 transition-colors hover:bg-white/5 hover:text-white lg:flex"
      >
        <PanelLeft className="h-5 w-5" aria-hidden="true" />
      </button>

      <h1 className="text-base font-semibold text-white">{current}</h1>

      {/* Right cluster */}
      <div className="ml-auto flex items-center gap-2 md:gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder="Search pools, runs..."
            className="h-10 w-56 rounded-full border border-white/10 bg-white/5 pl-9 pr-4 text-sm text-white placeholder:text-muted-foreground focus:border-accent/40 focus:outline-none focus:ring-2 focus:ring-accent/20 lg:w-72"
          />
        </div>

        <WalletButton />
      </div>
    </header>
  );
}
