import type { ReactNode } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { SidebarProvider } from '@/components/layout/sidebar-context';
import { ToastProvider } from '@/components/ui/toast';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <ToastProvider>
        <DashboardShell>{children}</DashboardShell>
      </ToastProvider>
    </SidebarProvider>
  );
}
