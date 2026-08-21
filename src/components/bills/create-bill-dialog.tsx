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
import { ScanCaptureField } from "@/components/attachments/scan-capture-field";
import { createBill } from "@/lib/bills/actions";
import { uploadAttachment } from "@/lib/attachments/actions";
import { extractBillFields, type ExtractedBill } from "@/lib/bills/extract-bill";
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

  const [extracted, setExtracted] = useState<ExtractedBill | null>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createBill(null, formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      // Same FormData reused for the upload — createBill ignores "file",
      // uploadAttachment only reads it. Upload failure doesn't undo the
      // bill, which already saved successfully. The original document
      // attaches here regardless of whether extraction ran or succeeded.
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
      setExtracted(null);
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setError(null);
          setExtracted(null);
        }
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
          <ScanCaptureField<ExtractedBill>
            label="Scan the bill"
            hint="Tap to photograph or upload the bill — we'll fill in the details automatically"
            scanAction={(file) => {
              const formData = new FormData();
              formData.set("file", file);
              return extractBillFields(null, formData);
            }}
            onScanned={setExtracted}
            resultCaption={(confidence) =>
              `AI-extracted (${confidence} confidence) — review the fields below before saving. Empty fields weren't found and need to be filled in manually.`
            }
          />
          {/* Remounting via key is what makes new defaultValues take effect
              after an async scan completes on an already-open dialog —
              defaultValue only applies at mount, not on prop changes. */}
          <BillFormFields
            key={extracted ? "extracted" : "empty"}
            utilities={utilities}
            defaultValues={
              extracted
                ? {
                    provider: extracted.provider,
                    amount: extracted.amount ?? undefined,
                    currency: extracted.currency ?? undefined,
                    issueDate: extracted.issueDate,
                    dueDate: extracted.dueDate ?? undefined,
                  }
                : undefined
            }
          />
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
