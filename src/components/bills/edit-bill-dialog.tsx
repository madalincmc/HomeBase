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
import { AttachmentUploadField } from "@/components/attachments/attachment-upload-field";
import { AttachmentList } from "@/components/attachments/attachment-list";
import { updateBill } from "@/lib/bills/actions";
import { uploadAttachment } from "@/lib/attachments/actions";
import { BillFormFields, type BillFormUtilityOption } from "./bill-form-fields";
import type { bills, schedules, attachments } from "@/db/schema";

type Bill = typeof bills.$inferSelect;
type Schedule = typeof schedules.$inferSelect;
type Attachment = typeof attachments.$inferSelect;

const RECURRING_FREQUENCIES = ["monthly", "every_x_months", "yearly", "custom"] as const;

export function EditBillDialog({
  bill,
  schedule,
  utilities,
  attachments,
}: {
  bill: Bill;
  schedule: Schedule | null;
  utilities: BillFormUtilityOption[];
  attachments: Attachment[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateBill(bill.id, null, formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      const uploadResult = await uploadAttachment({ billId: bill.id }, ["/bills", "/"], null, formData);
      if (!uploadResult.success) {
        setError(uploadResult.error);
        return;
      }
      setError(null);
      setOpen(false);
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
          {attachments.length > 0 && (
            <Field>
              <FieldLabel>Attachments</FieldLabel>
              <AttachmentList attachments={attachments} revalidatePaths={["/bills", "/"]} />
            </Field>
          )}
          <AttachmentUploadField label="Add bill photo/document" />
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
