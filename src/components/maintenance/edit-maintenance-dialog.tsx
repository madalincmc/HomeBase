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
import { updateMaintenanceItem } from "@/lib/maintenance/actions";
import { MaintenanceFormFields, type MaintenanceFormRoomOption } from "./maintenance-form-fields";
import type { maintenanceItems, schedules } from "@/db/schema";

type MaintenanceItem = typeof maintenanceItems.$inferSelect;
type Schedule = typeof schedules.$inferSelect;

const RECURRING_FREQUENCIES = ["daily", "weekly", "monthly", "every_x_months", "yearly", "custom"] as const;

export function EditMaintenanceDialog({
  item,
  schedule,
  rooms,
  dueDate,
}: {
  item: MaintenanceItem;
  schedule: Schedule | null;
  rooms: MaintenanceFormRoomOption[];
  dueDate: string;
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
