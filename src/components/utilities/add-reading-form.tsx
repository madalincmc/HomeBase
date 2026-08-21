"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field";
import { AttachmentUploadField } from "@/components/attachments/attachment-upload-field";
import { addMeterReading } from "@/lib/utilities/actions";
import { uploadAttachment } from "@/lib/attachments/actions";

export function AddReadingForm({
  utilityId,
  unit,
  onSuccess,
}: {
  utilityId: string;
  unit: string;
  // Optional: the utility detail page embeds this form inline and just
  // resets it to add another reading, but the quick-actions dialog (MAD-100)
  // needs to close itself afterward — called once the reading (and any
  // attachment) has saved successfully.
  onSuccess?: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await addMeterReading(utilityId, null, formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      // Same FormData, reused: addMeterReading ignored its "file" field,
      // uploadAttachment only reads that one. Upload failure doesn't roll
      // back the reading — it already saved successfully.
      const uploadResult = await uploadAttachment(
        { meterReadingId: result.readingId },
        [`/utilities/${utilityId}`],
        null,
        formData
      );
      if (!uploadResult.success) {
        setError(uploadResult.error);
        return;
      }
      setError(null);
      formRef.current?.reset();
      onSuccess?.();
    });
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form ref={formRef} action={handleSubmit} className="flex flex-col gap-4">
      <FieldGroup>
        <Field orientation="responsive">
          <FieldLabel htmlFor="value">Reading ({unit})</FieldLabel>
          <Input id="value" name="value" type="number" step="any" inputMode="decimal" required />
        </Field>
        <Field orientation="responsive">
          <FieldLabel htmlFor="readingDate">Date</FieldLabel>
          <Input id="readingDate" name="readingDate" type="date" defaultValue={today} required />
        </Field>
        <Field>
          <FieldLabel htmlFor="notes">Notes</FieldLabel>
          <Textarea id="notes" name="notes" rows={2} />
        </Field>
        <AttachmentUploadField label="Meter photo" />
      </FieldGroup>
      {error && <FieldError>{error}</FieldError>}
      <Button type="submit" disabled={pending} size="lg" className="w-full md:w-auto md:self-start">
        {pending ? "Saving…" : "Add reading"}
      </Button>
    </form>
  );
}
