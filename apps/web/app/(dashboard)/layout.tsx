import type { ReactNode } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { SidebarProvider } from '@/components/layout/sidebar-context';
import { ChatPanelProvider } from '@/components/chat/chat-panel-context';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <ChatPanelProvider>
        <DashboardShell>{children}</DashboardShell>
      </ChatPanelProvider>
    </SidebarProvider>
  );
}
