import type { Route } from "next";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Zap,
  Receipt,
  ListChecks,
  Wrench,
  Package,
  FolderOpen,
  History,
  Settings,
  MoreHorizontal,
} from "lucide-react";

export type NavItem = {
  href: Route;
  label: string;
  icon: LucideIcon;
};

export const desktopNavItems: NavItem[] = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/utilities", label: "Utilities", icon: Zap },
  { href: "/bills", label: "Bills", icon: Receipt },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/documents", label: "Documents", icon: FolderOpen },
  { href: "/history", label: "History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const mobileNavItems: NavItem[] = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/bills", label: "Bills", icon: Receipt },
  { href: "/utilities", label: "Utilities", icon: Zap },
  { href: "/more", label: "More", icon: MoreHorizontal },
];
