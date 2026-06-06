'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navItems, miniAppNavItems } from '@/components/layout/nav-items';
import { cn } from '@/lib/utils';

/**
 * Floating bottom dock. Shared by the dashboard (mobile only) and the Mini App
 * (always visible). The item set is chosen by `variant` rather than passed in,
 * so the function-bearing nav data never crosses a server/client boundary.
 * Glassmorphic pill that respects the iOS home bar via env(safe-area-inset-bottom).
 */
export function Dock({
  variant = 'dashboard',
}: {
  variant?: 'dashboard' | 'mini-app';
}) {
  const pathname = usePathname();
  const items = variant === 'mini-app' ? miniAppNavItems : navItems;
  const alwaysShow = variant === 'mini-app';

  // Active item is the one whose href is the longest matching prefix, so a
  // parent route like "/mini-app" does not stay active on its sub-routes.
  const activeHref = items
    .filter(
      (i) => pathname === i.href || pathname.startsWith(`${i.href}/`)
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 flex justify-center px-4',
        !alwaysShow && 'lg:hidden'
      )}
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
    >
      <nav className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1.5 shadow-2xl shadow-black/40 backdrop-blur-xl">
        {items.map((item) => {
          const active = item.href === activeHref;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.name}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-full px-4 py-2 text-[11px] font-medium transition-colors',
                active
                  ? 'bg-accent/15 text-accent'
                  : 'text-white/60 hover:text-white'
              )}
            >
              <Icon
                className={cn(
                  'transition-transform',
                  active ? 'h-6 w-6' : 'h-5 w-5'
                )}
                aria-hidden="true"
              />
              <span>{item.shortName}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
