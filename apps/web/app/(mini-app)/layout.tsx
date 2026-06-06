import type { ReactNode } from 'react';
import { TelegramProvider } from '@/components/mini-app/telegram-provider';
import { ToastProvider } from '@/components/ui/toast';
import { WalletProvider } from '@/components/wallet/wallet-provider';

/**
 * Base Telegram Mini App layout: initialises the WebView and provides toasts to
 * every screen (including the chrome-less onboarding flow). The header and Dock
 * live in the nested (shell) layout so onboarding can opt out of them.
 */
export default function MiniAppLayout({ children }: { children: ReactNode }) {
  return (
    <TelegramProvider>
      <WalletProvider>
        <ToastProvider>
          <div className="min-h-[100dvh] bg-black text-white">{children}</div>
        </ToastProvider>
      </WalletProvider>
    </TelegramProvider>
  );
}
