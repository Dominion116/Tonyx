'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ONBOARDED_KEY } from '@/components/mini-app/onboarding';

/**
 * Sends first-time visitors to the onboarding flow before they reach the
 * shell screens (Home, Scanner, Settings). Mirrors the redirect-away check
 * onboarding itself does for already-onboarded users.
 */
export function OnboardingGate() {
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem(ONBOARDED_KEY) !== 'true') {
      router.replace('/mini-app/onboard');
    }
  }, [router]);

  return null;
}
