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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { updateMeterReading } from "@/lib/utilities/actions";
import type { AddReadingMeterPoint } from "./add-reading-form";

export function EditReadingDialog({
  readingId,
  unit,
  defaultValues,
  meterPoints = [],
  open,
  onOpenChange,
  trigger = true,
}: {
  readingId: string;
  unit: string;
  defaultValues: {
    value: string;
    readingDate: string;
    notes: string | null;
    meterPointId: string | null;
  };
  // Empty for every utility without named meter points, which hides the
  // location field entirely — same "conditionally rendered by data
  // availability" convention used everywhere else in the app.
  meterPoints?: AddReadingMeterPoint[];
  // Optional controlled mode, so an overflow menu item can be the trigger
  // instead of the dialog owning its own button (same props CreateBillDialog
  // and friends gained in MAD-100).
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: boolean;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isOpen = open ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateMeterReading(readingId, null, formData);
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
          <Button variant="outline">Edit</Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit reading</DialogTitle>
          <DialogDescription>
            Correcting a past reading also recalculates the consumption shown for it and for the
            reading after it.
          </DialogDescription>
        </DialogHeader>
        {/* Keyed on the stored values so reopening the dialog after an edit
            re-mounts the uncontrolled inputs with the saved data, rather
            than showing whatever was typed last time — defaultValue only
            applies at mount (the same gotcha MAD-103 hit). */}
        <form
          key={`${defaultValues.value}-${defaultValues.readingDate}-${defaultValues.meterPointId ?? "none"}`}
          action={handleSubmit}
          className="flex flex-col gap-4"
        >
          <FieldGroup>
            <Field orientation="responsive">
              <FieldLabel htmlFor={`value-${readingId}`}>Reading ({unit})</FieldLabel>
              <Input
                id={`value-${readingId}`}
                name="value"
                type="number"
                step="any"
                inputMode="decimal"
                defaultValue={defaultValues.value}
                required
              />
            </Field>
            {meterPoints.length > 0 && (
              <Field orientation="responsive">
                <FieldLabel htmlFor={`meterPointId-${readingId}`}>Location</FieldLabel>
                <Select name="meterPointId" defaultValue={defaultValues.meterPointId ?? "none"}>
                  <SelectTrigger id={`meterPointId-${readingId}`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {meterPoints.map((point) => (
                      <SelectItem key={point.id} value={point.id}>
                        {point.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <Field orientation="responsive">
              <FieldLabel htmlFor={`readingDate-${readingId}`}>Date</FieldLabel>
              <Input
                id={`readingDate-${readingId}`}
                name="readingDate"
                type="date"
                defaultValue={defaultValues.readingDate}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`notes-${readingId}`}>Notes</FieldLabel>
              <Textarea
                id={`notes-${readingId}`}
                name="notes"
                rows={2}
                defaultValue={defaultValues.notes ?? ""}
              />
            </Field>
          </FieldGroup>
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
