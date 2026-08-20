"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// The dialog is a placeholder — the actual add-meter-reading/bill/chore/
// maintenance flows are MAD-100's job. This just establishes the persistent
// button as part of the shell.
export function QuickActionButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size="icon-lg"
        className="fixed right-4 bottom-20 z-40 rounded-full shadow-lg md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Quick actions"
      >
        <Plus />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick actions</DialogTitle>
            <DialogDescription>
              Add a meter reading, bill, chore, or maintenance item. Coming soon.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
