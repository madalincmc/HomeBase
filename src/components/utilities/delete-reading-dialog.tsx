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
import { deleteMeterReading } from "@/lib/utilities/actions";

export function DeleteReadingDialog({
  readingId,
  label,
  hasAttachments,
  open,
  onOpenChange,
  trigger = true,
}: {
  readingId: string;
  // Preformatted on the server (date + value), for the same UTC-pinning
  // reason ChoreCard takes a `dueLabel` rather than formatting here.
  label: string;
  hasAttachments: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: boolean;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isOpen = open ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteMeterReading(readingId);
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
      open={isOpen}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      {trigger && (
        <DialogTrigger asChild>
          <Button variant="outline">Delete</Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this reading?</DialogTitle>
          <DialogDescription>
            {label} will be removed{hasAttachments ? ", along with its photo" : ""}, and the
            consumption around it recalculated. This can&apos;t be undone.
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
