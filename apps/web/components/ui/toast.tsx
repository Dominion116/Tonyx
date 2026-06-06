'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle2, X } from 'lucide-react';

interface ToastItem {
  id: string;
  title: string;
  description?: string;
}

interface ToastContextValue {
  toast: (t: { title: string; description?: string }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

/**
 * Minimal toast system. Toasts auto-dismiss after 4s and stack bottom-right,
 * clearing the mobile dock.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback(
    (id: string) => setItems((prev) => prev.filter((t) => t.id !== id)),
    []
  );

  const toast = useCallback<ToastContextValue['toast']>(
    ({ title, description }) => {
      const id = Math.random().toString(36).slice(2, 9);
      setItems((prev) => [...prev, { id, title, description }]);
      setTimeout(() => remove(id), 4000);
    },
    [remove]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-24 right-4 z-[90] flex flex-col gap-2 lg:bottom-4">
        {items.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex w-80 max-w-[calc(100vw-2rem)] items-start gap-3 rounded-xl border border-white/10 bg-black/90 p-3 shadow-2xl backdrop-blur-xl"
          >
            <CheckCircle2
              className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400"
              aria-hidden="true"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{t.title}</p>
              {t.description && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t.description}
                </p>
              )}
            </div>
            <button
              onClick={() => remove(t.id)}
              aria-label="Dismiss"
              className="text-muted-foreground transition-colors hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
