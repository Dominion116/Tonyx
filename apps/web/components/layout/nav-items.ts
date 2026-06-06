import {
  LayoutDashboard,
  Radar,
  SlidersHorizontal,
  History,
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
