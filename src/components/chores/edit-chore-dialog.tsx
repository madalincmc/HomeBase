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
import { updateChore } from "@/lib/chores/actions";
import { ChoreFormFields, type ChoreFormRoomOption } from "./chore-form-fields";
import type { chores, schedules } from "@/db/schema";

type Chore = typeof chores.$inferSelect;
type Schedule = typeof schedules.$inferSelect;

const RECURRING_FREQUENCIES = ["daily", "weekly", "monthly", "every_x_months", "yearly", "custom"] as const;

export function EditChoreDialog({
  chore,
  schedule,
  rooms,
  dueDate,
}: {
  chore: Chore;
  schedule: Schedule | null;
  rooms: ChoreFormRoomOption[];
  dueDate: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateChore(chore.id, null, formData);
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
          <DialogTitle>Edit chore</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <ChoreFormFields
            rooms={rooms}
            defaultValues={{
              title: chore.title,
              description: chore.description,
              roomId: chore.roomId,
              priority: chore.priority,
              assignee: chore.assignee,
              estimatedDurationMinutes: chore.estimatedDurationMinutes,
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
