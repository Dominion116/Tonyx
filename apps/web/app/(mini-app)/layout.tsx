import type { ReactNode } from 'react';
import { TelegramProvider } from '@/components/mini-app/telegram-provider';
import { MiniAppHeader } from '@/components/mini-app/mini-app-header';
import { Dock } from '@/components/layout/dock';
import { miniAppNavItems } from '@/components/layout/nav-items';
import { ToastProvider } from '@/components/ui/toast';

/**
 * Telegram Mini App shell. Always-mobile layout that mirrors the dashboard's
 * mobile view: a compact header, full-width content, and the shared Dock
 * pinned to the bottom.
 */
export default function MiniAppLayout({ children }: { children: ReactNode }) {
  return (
    <TelegramProvider>
      <ToastProvider>
        <div className="flex min-h-[100dvh] flex-col bg-black text-white">
          <MiniAppHeader />
          <main className="flex-1 px-4 pb-28 pt-4">{children}</main>
          <Dock items={miniAppNavItems} alwaysShow />
        </div>
      </ToastProvider>
    </TelegramProvider>
  );
}
