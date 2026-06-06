'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navItems } from '@/components/layout/nav-items';
import { useSidebar } from '@/components/layout/sidebar-context';
import { cn } from '@/lib/utils';

/**
 * Desktop sidebar adapted from the admin template: a fixed left rail that
 * expands to a labelled menu or collapses to an icon-only strip, plus an
 * off-canvas drawer on mobile. Styling uses the global black / TON blue theme.
 */
export function DashboardSidebar() {
  const pathname = usePathname();
  const { isExpanded, isHovered, isMobileOpen, setHovered, closeMobile } =
    useSidebar();

  const showLabels = isExpanded || isHovered || isMobileOpen;

  return (
    <aside
      onMouseEnter={() => !isExpanded && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-white/10 bg-black px-4 py-6 transition-all duration-300 ease-in-out',
        showLabels ? 'w-[260px]' : 'w-[88px]',
        isMobileOpen ? 'translate-x-0' : '-translate-x-full',
        'lg:translate-x-0'
      )}
    >
      {/* Brand */}
      <Link
        href="/dashboard/overview"
        className={cn(
          'mb-8 flex items-center gap-2 px-2',
          !showLabels && 'lg:justify-center lg:px-0'
        )}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-sm font-bold text-accent-foreground">
          T
        </span>
        {showLabels && (
          <span className="text-lg font-bold text-white">Tonyx</span>
        )}
      </Link>

      {/* Nav */}
      <nav className="flex flex-col gap-1">
        {showLabels && (
          <span className="mb-2 px-3 text-xs uppercase tracking-wide text-muted-foreground">
            Menu
          </span>
        )}
        {navItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMobile}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                !showLabels && 'lg:justify-center lg:px-0',
                active
                  ? 'bg-accent/15 text-accent'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5 shrink-0',
                  active ? 'text-accent' : 'text-white/60 group-hover:text-white'
                )}
                aria-hidden="true"
              />
              {showLabels && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
