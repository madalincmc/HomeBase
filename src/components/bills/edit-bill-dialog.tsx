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
import { updateBill } from "@/lib/bills/actions";
import { BillFormFields, type BillFormUtilityOption } from "./bill-form-fields";
import type { bills, schedules } from "@/db/schema";

type Bill = typeof bills.$inferSelect;
type Schedule = typeof schedules.$inferSelect;

const RECURRING_FREQUENCIES = ["monthly", "every_x_months", "yearly", "custom"] as const;

export function EditBillDialog({
  bill,
  schedule,
  utilities,
}: {
  bill: Bill;
  schedule: Schedule | null;
  utilities: BillFormUtilityOption[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateBill(bill.id, null, formData);
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
          <DialogTitle>Edit bill</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <BillFormFields
            utilities={utilities}
            defaultValues={{
              title: bill.title,
              provider: bill.provider,
              utilityId: bill.utilityId,
              amount: bill.amount,
              currency: bill.currency,
              issueDate: bill.issueDate,
              dueDate: bill.dueDate,
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
