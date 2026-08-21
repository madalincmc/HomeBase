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
import { createInventoryItem } from "@/lib/inventory/actions";
import { uploadAttachment } from "@/lib/attachments/actions";
import { InventoryFormFields, type InventoryFormRoomOption } from "./inventory-form-fields";

export function CreateInventoryItemDialog({ rooms }: { rooms: InventoryFormRoomOption[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createInventoryItem(null, formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      // Same FormData reused for the upload — createInventoryItem ignores
      // "file", uploadAttachment only reads it (MAD-96/MAD-103 pattern).
      const uploadResult = await uploadAttachment({ inventoryItemId: result.itemId }, ["/inventory"], null, formData);
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
        <Button>Add item</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add inventory item</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <InventoryFormFields rooms={rooms} />
          <AttachmentUploadField label="Photo, receipt, or manual" />
          {error && <FieldError>{error}</FieldError>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Add item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
