'use client';

import type { ReactNode } from 'react';
import { TonConnectUIProvider } from '@tonconnect/ui-react';

/**
 * TON Connect provider for the wallet-enabled surfaces (dashboard, Mini App).
 * The manifest is served from /public; override with NEXT_PUBLIC_TON_MANIFEST_URL.
 *
 * Privy embedded-wallet fallback plugs in here once NEXT_PUBLIC_PRIVY_APP_ID is
 * configured (wrap children in <PrivyProvider> alongside TON Connect).
 */
const manifestUrl =
  process.env.NEXT_PUBLIC_TON_MANIFEST_URL ||
  'https://tonyx-web.vercel.app/tonconnect-manifest.json';

export function WalletProvider({ children }: { children: ReactNode }) {
  return (
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      {children}
    </TonConnectUIProvider>
  );
}
