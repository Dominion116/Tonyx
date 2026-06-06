'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

type SidebarContextValue = {
  /** Desktop: sidebar pinned open (full width) vs collapsed (icon rail). */
  isExpanded: boolean;
  /** Desktop: temporarily expanded while the cursor hovers a collapsed rail. */
  isHovered: boolean;
  /** Mobile: off-canvas sidebar drawer open. */
  isMobileOpen: boolean;
  toggleExpanded: () => void;
  setHovered: (value: boolean) => void;
  toggleMobile: () => void;
  closeMobile: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const value: SidebarContextValue = {
    isExpanded,
    isHovered,
    isMobileOpen,
    toggleExpanded: () => setIsExpanded((v) => !v),
    setHovered: setIsHovered,
    toggleMobile: () => setIsMobileOpen((v) => !v),
    closeMobile: () => setIsMobileOpen(false),
  };

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return ctx;
}
