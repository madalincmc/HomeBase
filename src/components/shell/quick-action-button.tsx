"use client";

import { useState, useTransition } from "react";
import { Plus, Zap, Receipt, ListChecks, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AddReadingDialog } from "@/components/utilities/add-reading-dialog";
import { CreateBillDialog } from "@/components/bills/create-bill-dialog";
import { CreateChoreDialog } from "@/components/chores/create-chore-dialog";
import { CreateMaintenanceDialog } from "@/components/maintenance/create-maintenance-dialog";
import { getQuickActionContext, type QuickActionContext } from "@/lib/quick-actions/get-quick-action-context";

type ActiveAction = "reading" | "bill" | "chore" | "maintenance" | null;

const EMPTY_CONTEXT: QuickActionContext = { utilities: [], rooms: [] };

// Mobile-only (md:hidden below), matching the PRD's "desktop tells you
// what's happening, mobile helps you take care of it" split — this is
// deliberately not duplicated as a desktop affordance.
export function QuickActionButton() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState<ActiveAction>(null);
  const [context, setContext] = useState<QuickActionContext>(EMPTY_CONTEXT);
  const [, startTransition] = useTransition();

  function openMenu() {
    setMenuOpen(true);
    // Refetch on EVERY open, not just the first. This button lives in
    // AppShell, which the root layout renders around every route, so it
    // never unmounts during client-side navigation. Caching the first
    // result meant a utility or room created afterwards stayed invisible
    // here until a full page reload — "Add meter reading" would keep
    // insisting there were no utilities yet. The notification bell already
    // refetches on every open for exactly this reason.
    // The previous context stays on screen meanwhile, so there's no flash.
    startTransition(async () => {
      setContext(await getQuickActionContext());
    });
  }

  function selectAction(action: ActiveAction) {
    setMenuOpen(false);
    setActive(action);
  }

  return (
    <>
      {/* bottom reads the same --mobile-footer-height MobileNav sizes itself
          with (globals.css) — keeps the FAB sitting right above the footer
          regardless of how tall the safe-area branding strip ends up being. */}
      <Button
        size="icon-lg"
        className="fixed right-4 bottom-[var(--mobile-footer-height)] z-40 rounded-full shadow-lg md:hidden"
        onClick={openMenu}
        aria-label="Quick actions"
      >
        <Plus />
      </Button>

      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick actions</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="lg"
              className="justify-start gap-3"
              onClick={() => selectAction("reading")}
            >
              <Zap className="size-4" /> Add meter reading
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="justify-start gap-3"
              onClick={() => selectAction("bill")}
            >
              <Receipt className="size-4" /> Add bill
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="justify-start gap-3"
              onClick={() => selectAction("chore")}
            >
              <ListChecks className="size-4" /> Add chore
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="justify-start gap-3"
              onClick={() => selectAction("maintenance")}
            >
              <Wrench className="size-4" /> Add maintenance item
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Always mounted (rather than conditionally rendered per `active`) so
          Radix's close animation plays normally instead of being cut off by
          an unmount — `active` just controls which one reports itself open. */}
      <AddReadingDialog
        utilities={context.utilities}
        open={active === "reading"}
        onOpenChange={(next) => setActive(next ? "reading" : null)}
      />
      <CreateBillDialog
        utilities={context.utilities}
        trigger={false}
        open={active === "bill"}
        onOpenChange={(next) => setActive(next ? "bill" : null)}
      />
      <CreateChoreDialog
        rooms={context.rooms}
        trigger={false}
        open={active === "chore"}
        onOpenChange={(next) => setActive(next ? "chore" : null)}
      />
      <CreateMaintenanceDialog
        rooms={context.rooms}
        trigger={false}
        open={active === "maintenance"}
        onOpenChange={(next) => setActive(next ? "maintenance" : null)}
      />
    </>
  );
}
