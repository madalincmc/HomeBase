"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { mobileNavItems } from "./nav-items";

// Two-tier footer: a fixed-height row of tappable buttons sitting above a
// thin branding strip. The strip's height is the safe-area inset itself
// (see the --mobile-nav-branding-height comment in globals.css), so the
// buttons row never has to share space with the iOS home-indicator gesture
// zone — a tap near the bottom edge lands on a button, not on the strip.
export function MobileNav() {
  const pathname = usePathname();

  return (
    <footer className="fixed inset-x-0 bottom-0 z-40 border-t bg-background md:hidden">
      <nav className="flex" style={{ height: "var(--mobile-nav-row-height)" }}>
        {mobileNavItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium",
                active ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div
        className="flex items-start justify-center border-t pt-1 text-[10px] font-medium tracking-wide text-muted-foreground"
        style={{ height: "var(--mobile-nav-branding-height)" }}
      >
        HomeBase
      </div>
    </footer>
  );
}
