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
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { AttachmentList } from "@/components/attachments/attachment-list";
import { updateMaintenanceItem } from "@/lib/maintenance/actions";
import { MaintenanceFormFields, type MaintenanceFormRoomOption } from "./maintenance-form-fields";
import type { maintenanceItems, schedules, attachments } from "@/db/schema";

type MaintenanceItem = typeof maintenanceItems.$inferSelect;
type Schedule = typeof schedules.$inferSelect;
type Attachment = typeof attachments.$inferSelect;

const RECURRING_FREQUENCIES = ["daily", "weekly", "monthly", "every_x_months", "yearly", "custom"] as const;

// New photos attach at completion time (CompleteMaintenanceDialog), matching
// the PRD's quick workflow — this dialog is for viewing/removing existing
// ones, not adding more.
export function EditMaintenanceDialog({
  item,
  schedule,
  rooms,
  dueDate,
  attachments,
}: {
  item: MaintenanceItem;
  schedule: Schedule | null;
  rooms: MaintenanceFormRoomOption[];
  dueDate: string;
  attachments: Attachment[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateMaintenanceItem(item.id, null, formData);
      if (result.success) {
        setError(null);
        setOpen(false);
      } else {
        setError(result.error);
      }
    });
  }

  const scheduleFrequency = RECURRING_FREQUENCIES.includes(
    schedule?.frequency as (typeof RECURRING_FREQUENCIES)[number]
  )
    ? (schedule!.frequency as (typeof RECURRING_FREQUENCIES)[number])
    : null;

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
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit maintenance item</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <MaintenanceFormFields
            rooms={rooms}
            defaultValues={{
              title: item.title,
              description: item.description,
              category: item.category,
              roomId: item.roomId,
              relatedAppliance: item.relatedAppliance,
              priority: item.priority,
              estimatedCost: item.estimatedCost,
              dueDate,
              scheduleFrequency,
              scheduleInterval: schedule?.interval ?? null,
            }}
          />
          {attachments.length > 0 && (
            <Field>
              <FieldLabel>Attachments</FieldLabel>
              <AttachmentList attachments={attachments} revalidatePaths={["/maintenance", "/"]} />
            </Field>
          )}
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
