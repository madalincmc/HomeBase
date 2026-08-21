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
import { AttachmentUploadField } from "@/components/attachments/attachment-upload-field";
import { createBill } from "@/lib/bills/actions";
import { uploadAttachment } from "@/lib/attachments/actions";
import { BillFormFields, type BillFormUtilityOption } from "./bill-form-fields";

export function CreateBillDialog({
  utilities,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  trigger = true,
}: {
  utilities: BillFormUtilityOption[];
  // Uncontrolled (self-triggering, own state) by default, matching every
  // page that renders this directly. The quick-actions menu (MAD-100) needs
  // a controlled instance with no built-in trigger, since the menu item
  // itself is the trigger.
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: boolean;
}) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChangeProp ?? setOpenState;
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createBill(null, formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      // Same FormData reused for the upload — createBill ignores "file",
      // uploadAttachment only reads it. Upload failure doesn't undo the
      // bill, which already saved successfully.
      const uploadResult = await uploadAttachment(
        { billId: result.billId },
        ["/bills", "/"],
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
      {trigger && (
        <DialogTrigger asChild>
          <Button>Add bill</Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add bill</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <BillFormFields utilities={utilities} />
          <AttachmentUploadField label="Bill photo/document" />
          {error && <FieldError>{error}</FieldError>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Add bill"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
