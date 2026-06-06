import {
  LayoutDashboard,
  Radar,
  MessageSquare,
  SlidersHorizontal,
  History,
  Home,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export type NavItem = {
  name: string;
  /** Short label used by the compact mobile dock. */
  shortName: string;
  href: string;
  icon: LucideIcon;
};

/**
 * Single source of truth for dashboard navigation. Consumed by both the
 * desktop sidebar and the mobile floating dock so the two never drift.
 */
export const navItems: NavItem[] = [
  {
    name: 'Overview',
    shortName: 'Home',
    href: '/dashboard/overview',
    icon: LayoutDashboard,
  },
  {
    name: 'Scanner',
    shortName: 'Scanner',
    href: '/dashboard/scanner',
    icon: Radar,
  },
  {
    name: 'Chat',
    shortName: 'Chat',
    href: '/dashboard/chat',
    icon: MessageSquare,
  },
  {
    name: 'Policy',
    shortName: 'Policy',
    href: '/dashboard/policy',
    icon: SlidersHorizontal,
  },
  {
    name: 'History',
    shortName: 'History',
    href: '/dashboard/history',
    icon: History,
  },
];

/**
 * Telegram Mini App navigation. Mirrors the dashboard's mobile experience but
 * points at the compact `/mini-app` routes. Consumed by the shared Dock.
 */
export const miniAppNavItems: NavItem[] = [
  { name: 'Home', shortName: 'Home', href: '/mini-app', icon: Home },
  { name: 'Scanner', shortName: 'Scanner', href: '/mini-app/scanner', icon: Radar },
  { name: 'Chat', shortName: 'Chat', href: '/mini-app/chat', icon: MessageSquare },
  { name: 'Settings', shortName: 'Settings', href: '/mini-app/settings', icon: Settings },
];
