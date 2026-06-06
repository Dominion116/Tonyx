'use client';

import type { ReactNode } from 'react';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar';
import { Dock } from '@/components/layout/dock';
import { useSidebar } from '@/components/layout/sidebar-context';
import { ChatPanel } from '@/components/chat/chat-panel';
import { useChatPanel } from '@/components/chat/chat-panel-context';
import { cn } from '@/lib/utils';

/**
 * Wires the sidebar, header, mobile drawer backdrop, page content, and the
 * mobile dock together. The main column margin tracks the desktop sidebar
 * width; on mobile the sidebar is an overlay so the column stays full width.
 */
export function DashboardShell({ children }: { children: ReactNode }) {
  const { isExpanded, isHovered, isMobileOpen, closeMobile } = useSidebar();
  const { isOpen: isChatOpen } = useChatPanel();

  const marginClass = cn(
    isExpanded || isHovered ? 'lg:ml-[260px]' : 'lg:ml-[88px]',
    // Make room for the chat panel on desktop when it is open.
    isChatOpen && 'lg:mr-[360px]'
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <DashboardSidebar />

      {/* Mobile drawer backdrop */}
      {isMobileOpen && (
        <button
          aria-label="Close menu"
          onClick={closeMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      <div className={cn('flex flex-1 flex-col transition-all duration-300', marginClass)}>
        <DashboardHeader />
        {/* pb leaves room for the floating dock on mobile */}
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 pb-28 md:p-6 lg:pb-6">
          {children}
        </main>
      </div>

      <Dock />
      <ChatPanel />
    </div>
  );
}
