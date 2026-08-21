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
import { createRepair } from "@/lib/repairs/actions";
import { uploadAttachment } from "@/lib/attachments/actions";
import { RepairFormFields } from "./repair-form-fields";

export function CreateRepairDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const today = new Date().toISOString().slice(0, 10);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createRepair(null, formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      const uploadResult = await uploadAttachment({ repairId: result.repairId }, ["/repairs", "/"], null, formData);
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
      <DialogTrigger asChild>
        <Button>Report repair</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report a repair</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <RepairFormFields defaultValues={{ reportedDate: today }} />
          <AttachmentUploadField label="Photo or document" />
          {error && <FieldError>{error}</FieldError>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Report repair"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
