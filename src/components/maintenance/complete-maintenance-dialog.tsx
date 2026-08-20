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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field";
import { AttachmentUploadField } from "@/components/attachments/attachment-upload-field";
import { completeMaintenanceOccurrence } from "@/lib/maintenance/actions";
import { uploadAttachment } from "@/lib/attachments/actions";

// Cost/notes/photo are optional per the PRD's quick workflow ("complete →
// record optional cost/photo → next occurrence scheduled") — a dialog
// rather than chores' one-tap button, since these fields are worth keeping.
// The photo attaches to the maintenance item itself (attachments.
// maintenanceItemId), not the specific occurrence — see MAD-96 in CLAUDE.md.
export function CompleteMaintenanceDialog({
  occurrenceId,
  itemId,
  title,
}: {
  occurrenceId: string;
  itemId: string;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await completeMaintenanceOccurrence(occurrenceId, null, formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      const uploadResult = await uploadAttachment(
        { maintenanceItemId: itemId },
        ["/maintenance", "/"],
        null,
        formData
      );
      if (!uploadResult.success) {
        setError(uploadResult.error);
        return;
      }
      setError(null);
      setOpen(false);
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
        <Button size="sm">Complete</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete &quot;{title}&quot;</DialogTitle>
          <DialogDescription>Cost, notes, and photo are all optional.</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="cost">Actual cost</FieldLabel>
              <Input id="cost" name="cost" type="number" min="0" step="any" inputMode="decimal" />
            </Field>
            <Field>
              <FieldLabel htmlFor="notes">Notes</FieldLabel>
              <Textarea id="notes" name="notes" rows={2} />
            </Field>
            <AttachmentUploadField label="Photo" />
          </FieldGroup>
          {error && <FieldError>{error}</FieldError>}
          <DialogFooter>
            <Button type="submit" disabled={pending} size="lg" className="w-full">
              {pending ? "Saving…" : "Confirm complete"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
