'use client';

import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

/**
 * Minimal centered modal with a glass backdrop. Closes on backdrop click and
 * the Escape key.
 */
export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    // Bottom sheet on mobile, centered dialog from sm up.
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-black/70 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-full animate-slide-up rounded-t-2xl border border-white/10 bg-black p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-2xl sm:max-w-sm sm:animate-fade-in sm:rounded-2xl sm:pb-5"
      >
        {/* Grab handle (mobile only) */}
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/15 sm:hidden" />

        {title && (
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-muted-foreground transition-colors hover:text-white"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
