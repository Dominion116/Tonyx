'use client';

import { useEffect, useRef, useState } from 'react';
import { useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';
import { ChevronDown, LogOut, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const truncate = (a: string) => `${a.slice(0, 4)}...${a.slice(-4)}`;

/**
 * Wallet action for the top nav. Shows "Connect wallet" via the TON Connect
 * modal, or the truncated address with a disconnect menu once connected.
 * Establishes/clears the server session (httpOnly cookie) on connect/disconnect
 * and auto-reconnects because TON Connect restores the session on load.
 */
export function WalletButton({ className }: { className?: string }) {
  const address = useTonAddress();
  const [tonConnectUI] = useTonConnectUI();
  const [menuOpen, setMenuOpen] = useState(false);
  const prevAddress = useRef('');

  useEffect(() => {
    if (address && address !== prevAddress.current) {
      // New or restored connection: establish the server session.
      fetch('/api/wallet/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      }).catch(() => {});
    } else if (!address && prevAddress.current) {
      fetch('/api/wallet/disconnect', { method: 'POST' }).catch(() => {});
    }
    prevAddress.current = address;
  }, [address]);

  if (!address) {
    return (
      <Button size="sm" className={className} onClick={() => tonConnectUI.openModal()}>
        <Wallet className="h-4 w-4" aria-hidden="true" />
        Connect wallet
      </Button>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="flex h-9 items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 text-sm font-medium text-white transition-colors hover:bg-accent/20"
      >
        <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
        {truncate(address)}
        <ChevronDown className="h-4 w-4 text-white/60" aria-hidden="true" />
      </button>

      {menuOpen && (
        <>
          <button
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-xl border border-white/10 bg-black p-1 shadow-2xl">
            <button
              onClick={async () => {
                setMenuOpen(false);
                await tonConnectUI.disconnect();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/5 hover:text-white"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Disconnect
            </button>
          </div>
        </>
      )}
    </div>
  );
}
