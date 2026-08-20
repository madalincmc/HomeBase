import { SidebarNav } from "./sidebar-nav";
import { MobileNav } from "./mobile-nav";
import { QuickActionButton } from "./quick-action-button";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full">
      <aside className="hidden w-60 shrink-0 border-r md:flex md:flex-col">
        <div className="border-b px-4 py-4 text-lg font-semibold">HomeBase</div>
        <SidebarNav />
      </aside>
      <div className="flex min-h-full flex-1 flex-col">
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
      </div>
      <MobileNav />
      <QuickActionButton />
    </div>
  );
}
