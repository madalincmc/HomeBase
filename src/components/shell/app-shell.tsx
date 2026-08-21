import { SidebarNav } from "./sidebar-nav";
import { MobileNav } from "./mobile-nav";
import { QuickActionButton } from "./quick-action-button";
import { NotificationBell } from "./notification-bell";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full">
      <aside className="hidden w-60 shrink-0 border-r md:flex md:flex-col">
        <div className="border-b px-4 py-4 text-lg font-semibold">HomeBase</div>
        <SidebarNav />
      </aside>
      <div className="flex min-h-full flex-1 flex-col">
        <div className="flex items-center justify-between border-b px-4 py-2 md:justify-end md:px-6">
          <span className="text-sm font-semibold md:hidden">HomeBase</span>
          <NotificationBell />
        </div>
        {/* pb reads the same --mobile-footer-height MobileNav sizes itself
            with (globals.css) — a magic-number match here would silently
            drift out of sync the next time that footer's height changes. */}
        <main className="flex-1 pb-[var(--mobile-footer-height)] md:pb-0">{children}</main>
      </div>
      <MobileNav />
      <QuickActionButton />
    </div>
  );
}
