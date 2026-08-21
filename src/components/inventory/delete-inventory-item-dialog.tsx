"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/field";
import { deleteInventoryItem } from "@/lib/inventory/actions";

export function DeleteInventoryItemDialog({ itemId, name }: { itemId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteInventoryItem(itemId);
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
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete &quot;{name}&quot;?</DialogTitle>
          <DialogDescription>
            This also removes its attached photos, receipts, and manuals. This can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>
        {error && <FieldError>{error}</FieldError>}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={pending}>
            {pending ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
