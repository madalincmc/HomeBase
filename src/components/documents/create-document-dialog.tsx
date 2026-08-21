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
import { Field, FieldLabel, FieldDescription, FieldGroup, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel } from "@/components/ui/select";
import { AttachmentUploadField } from "@/components/attachments/attachment-upload-field";
import { createDocument } from "@/lib/documents/actions";
import type { LinkableEntities } from "@/lib/documents/get-documents";
import type { Room } from "@/lib/rooms/get-rooms";

export function CreateDocumentDialog({ rooms, linkable }: { rooms: Room[]; linkable: LinkableEntities }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createDocument(null, formData);
      if (!result.success) {
        setError(result.error);
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
        <Button>Add document</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add document</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="title">Title</FieldLabel>
              <Input id="title" name="title" placeholder="Boiler warranty" required />
            </Field>
            <Field orientation="responsive">
              <FieldLabel htmlFor="category">Category</FieldLabel>
              <Input id="category" name="category" placeholder="Warranty, Manual, Receipt…" />
            </Field>
            {rooms.length > 0 && (
              <Field orientation="responsive">
                <FieldLabel htmlFor="roomId">Area</FieldLabel>
                <Select name="roomId" defaultValue="none">
                  <SelectTrigger id="roomId" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
            {(linkable.bills.length > 0 ||
              linkable.maintenanceItems.length > 0 ||
              linkable.inventoryItems.length > 0) && (
              <Field>
                <FieldLabel htmlFor="link">Link to</FieldLabel>
                <Select name="link" defaultValue="none">
                  <SelectTrigger id="link" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nothing</SelectItem>
                    {linkable.bills.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Bills</SelectLabel>
                        {linkable.bills.map((bill) => (
                          <SelectItem key={bill.id} value={`bill:${bill.id}`}>
                            {bill.title}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                    {linkable.maintenanceItems.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Maintenance</SelectLabel>
                        {linkable.maintenanceItems.map((item) => (
                          <SelectItem key={item.id} value={`maintenance_item:${item.id}`}>
                            {item.title}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                    {linkable.inventoryItems.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Inventory</SelectLabel>
                        {linkable.inventoryItems.map((item) => (
                          <SelectItem key={item.id} value={`inventory_item:${item.id}`}>
                            {item.title}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
                <FieldDescription>Optional — connects this document to a bill or maintenance item.</FieldDescription>
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="notes">Notes</FieldLabel>
              <Textarea id="notes" name="notes" rows={2} />
            </Field>
          </FieldGroup>
          <AttachmentUploadField label="Document" required />
          {error && <FieldError>{error}</FieldError>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Uploading…" : "Add document"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
