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
import { updateUtility } from "@/lib/utilities/actions";
import { UtilityFormFields } from "./utility-form-fields";
import type { utilities, schedules } from "@/db/schema";

type Utility = typeof utilities.$inferSelect;
type Schedule = typeof schedules.$inferSelect;

export function EditUtilityDialog({
  utility,
  schedule,
}: {
  utility: Utility;
  schedule: Schedule | null;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateUtility(utility.id, null, formData);
      if (result.success) {
        setError(null);
        setOpen(false);
      } else {
        setError(result.error);
      }
    });
  }

  const scheduleFrequency =
    schedule?.frequency === "monthly" || schedule?.frequency === "custom" ? schedule.frequency : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">Edit</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit utility</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <UtilityFormFields
            defaultValues={{
              type: utility.type,
              provider: utility.provider,
              accountReference: utility.accountReference,
              unit: utility.unit,
              scheduleFrequency,
              scheduleAnchorDate: schedule?.anchorDate ?? null,
            }}
          />
          {error && <FieldError>{error}</FieldError>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
