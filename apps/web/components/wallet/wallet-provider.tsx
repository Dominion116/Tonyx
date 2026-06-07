'use client';

import { useState, type ReactNode } from 'react';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { wagmiConfig } from './evm-config';

/**
 * Wallet providers for the wallet-enabled surfaces (dashboard, Mini App).
 *
 * TON Connect remains the primary wallet (manifest served from /public,
 * override with NEXT_PUBLIC_TON_MANIFEST_URL). Reown AppKit + wagmi are
 * additive — they supply the EVM signer that cross-chain Omniston routes
 * settle orders through; TON-only users never have to touch them.
 */
const manifestUrl =
  process.env.NEXT_PUBLIC_TON_MANIFEST_URL ||
  'https://tonyx-web.vercel.app/tonconnect-manifest.json';

export function WalletProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </WagmiProvider>
    </TonConnectUIProvider>
  );
}
