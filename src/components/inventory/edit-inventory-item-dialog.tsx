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
import { updateInventoryItem } from "@/lib/inventory/actions";
import { uploadAttachment } from "@/lib/attachments/actions";
import { InventoryFormFields, type InventoryFormRoomOption } from "./inventory-form-fields";
import type { inventoryItems, attachments } from "@/db/schema";

type InventoryItem = typeof inventoryItems.$inferSelect;
type Attachment = typeof attachments.$inferSelect;

export function EditInventoryItemDialog({
  item,
  rooms,
  attachments,
}: {
  item: InventoryItem;
  rooms: InventoryFormRoomOption[];
  attachments: Attachment[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateInventoryItem(item.id, null, formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      const uploadResult = await uploadAttachment({ inventoryItemId: item.id }, ["/inventory"], null, formData);
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
        <Button variant="outline" size="sm">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit inventory item</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <InventoryFormFields
            rooms={rooms}
            defaultValues={{
              name: item.name,
              category: item.category,
              brand: item.brand,
              model: item.model,
              serialNumber: item.serialNumber,
              purchaseDate: item.purchaseDate,
              price: item.price,
              roomId: item.roomId,
              warrantyStartDate: item.warrantyStartDate,
              warrantyExpirationDate: item.warrantyExpirationDate,
            }}
          />
          {attachments.length > 0 && (
            <Field>
              <FieldLabel>Attachments</FieldLabel>
              <AttachmentList attachments={attachments} revalidatePaths={["/inventory"]} />
            </Field>
          )}
          <AttachmentUploadField label="Add photo, receipt, or manual" />
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
