"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field";
import { resolveRepair } from "@/lib/repairs/actions";

// Mirrors MarkPaidDialog (bills, MAD-93) — a small dialog rather than a
// one-tap button, since the repaired date (and optionally the actual cost)
// is still genuinely editable, pre-filled to today for the common case.
export function ResolveRepairDialog({ repairId, title }: { repairId: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const today = new Date().toISOString().slice(0, 10);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await resolveRepair(repairId, null, formData);
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
        <Button size="sm">Resolve</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolve &quot;{title}&quot;?</DialogTitle>
          <DialogDescription>Records the repaired date and, if known, the final cost.</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="repairedDate">Repaired date</FieldLabel>
              <Input id="repairedDate" name="repairedDate" type="date" defaultValue={today} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="cost">Cost</FieldLabel>
              <Input id="cost" name="cost" type="number" step="any" min="0" inputMode="decimal" />
            </Field>
          </FieldGroup>
          {error && <FieldError>{error}</FieldError>}
          <DialogFooter>
            <Button type="submit" disabled={pending} size="lg" className="w-full">
              {pending ? "Saving…" : "Confirm resolved"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
