import type { ReactNode } from 'react';
import { MiniAppHeader } from '@/components/mini-app/mini-app-header';
import { OnboardingGate } from '@/components/mini-app/onboarding-gate';
import { Dock } from '@/components/layout/dock';

/**
 * Chrome for the main Mini App screens: compact header, full-width content, and
 * the shared Dock pinned to the bottom. Mirrors the dashboard's mobile view.
 * Gated by OnboardingGate so first-time visitors land on the onboarding flow
 * (which lives outside this layout, chrome-less) before reaching these screens.
 */
export default function MiniAppShellLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <OnboardingGate />
      <MiniAppHeader />
      <main className="flex-1 px-4 pb-28 pt-4">{children}</main>
      <Dock variant="mini-app" />
    </div>
  );
}
