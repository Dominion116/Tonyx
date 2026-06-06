'use client';

import { useCallback, useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Script from 'next/script';

type TelegramWebApp = {
  ready: () => void;
  expand: () => void;
  colorScheme?: string;
  BackButton: {
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

/**
 * Initialises the Telegram Mini App WebView: loads the Telegram script, signals
 * ready, expands to full height, and wires the native BackButton to router
 * navigation. All calls are guarded, so the routes also work in a normal
 * browser during development.
 */
export function TelegramProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const init = useCallback(() => {
    const wa = window.Telegram?.WebApp;
    if (!wa) return;
    wa.ready();
    wa.expand();
  }, []);

  // Init on mount in case the script is already present.
  useEffect(() => {
    init();
  }, [init]);

  // Show the native back button on sub-routes; hide it on the home screen.
  useEffect(() => {
    const wa = window.Telegram?.WebApp;
    if (!wa) return;

    const onBack = () => router.back();

    if (pathname === '/mini-app') {
      wa.BackButton.hide();
    } else {
      wa.BackButton.show();
      wa.BackButton.onClick(onBack);
    }

    return () => wa.BackButton.offClick(onBack);
  }, [pathname, router]);

  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="afterInteractive"
        onLoad={init}
      />
      {children}
    </>
  );
}
