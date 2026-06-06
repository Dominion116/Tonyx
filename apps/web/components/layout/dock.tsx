'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navItems } from '@/components/layout/nav-items';
import { cn } from '@/lib/utils';

/**
 * Floating bottom dock for mobile (< lg). Shares the single `navItems` source
 * with the desktop sidebar. Glassmorphic pill that respects the iOS home bar
 * via env(safe-area-inset-bottom).
 */
export function Dock() {
  const pathname = usePathname();

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 lg:hidden"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
    >
      <nav className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1.5 shadow-2xl shadow-black/40 backdrop-blur-xl">
        {navItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
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
