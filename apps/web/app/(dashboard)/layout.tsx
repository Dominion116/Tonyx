import type { ReactNode } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { SidebarProvider } from '@/components/layout/sidebar-context';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <DashboardShell>{children}</DashboardShell>
    </SidebarProvider>
  );
}
