import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { createAppKit } from '@reown/appkit/react';
import { base, bsc, mainnet, polygon, type AppKitNetwork } from '@reown/appkit/networks';

/**
 * EVM wallet connection (Reown AppKit + wagmi). Additive to TON Connect — TON
 * stays the primary wallet; this wires the signer that cross-chain Omniston
 * routes settle EVM-side orders through (see STEPS.md Phases 2-5).
 */
export const evmProjectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ?? '';

export const evmNetworks = [mainnet, base, bsc, polygon] as [
  AppKitNetwork,
  ...AppKitNetwork[],
];

export const wagmiAdapter = new WagmiAdapter({
  networks: evmNetworks,
  projectId: evmProjectId,
  ssr: true,
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

// Always call createAppKit — it must run (and set the modal singleton) before
// any page renders, including during Next.js static prerendering, or
// useAppKit/useAppKitAccount throw "Please call createAppKit...". A missing
// project ID just logs internally; it doesn't block rendering or surface a
// user-facing alert (AlertController only opens a UI alert in debug mode).
createAppKit({
  adapters: [wagmiAdapter],
  networks: evmNetworks,
  projectId: evmProjectId,
  metadata: {
    name: 'Tonyx',
    description: 'Autonomous yield agent for the TON ecosystem',
    url: 'https://tonyx-web.vercel.app',
    icons: ['https://tonyx-web.vercel.app/icon.png'],
  },
  features: { analytics: false, email: false, socials: false },
});
