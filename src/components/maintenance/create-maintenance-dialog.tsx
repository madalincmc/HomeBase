"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/field";
import { createMaintenanceItem } from "@/lib/maintenance/actions";
import { MaintenanceFormFields, type MaintenanceFormRoomOption } from "./maintenance-form-fields";

export function CreateMaintenanceDialog({
  rooms,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  trigger = true,
}: {
  rooms: MaintenanceFormRoomOption[];
  // Uncontrolled (self-triggering, own state) by default. The quick-actions
  // menu (MAD-100) needs a controlled instance with no built-in trigger,
  // since the menu item itself is the trigger.
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: boolean;
}) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChangeProp ?? setOpenState;
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createMaintenanceItem(null, formData);
      if (result.success) {
        setError(null);
        setOpen(false);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      {trigger && (
        <DialogTrigger asChild>
          <Button>Add maintenance item</Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add maintenance item</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <MaintenanceFormFields rooms={rooms} />
          {error && <FieldError>{error}</FieldError>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Add item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
