"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field";
import { AttachmentUploadField } from "@/components/attachments/attachment-upload-field";
import { addMeterReading } from "@/lib/utilities/actions";
import { uploadAttachment } from "@/lib/attachments/actions";
import { extractMeterReading } from "@/lib/utilities/extract-reading";
import { cn } from "@/lib/utils";

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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const valueInputRef = useRef<HTMLInputElement>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanConfidence, setScanConfidence] = useState<"high" | "medium" | "low" | null>(null);
  const [scanning, startScanTransition] = useTransition();

  function handleScan() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setScanError("Choose a meter photo first.");
      return;
    }
    const scanFormData = new FormData();
    scanFormData.set("file", file);
    startScanTransition(async () => {
      const result = await extractMeterReading(null, scanFormData);
      if (!result.success) {
        setScanConfidence(null);
        setScanError(result.error);
        return;
      }
      setScanError(null);
      setScanConfidence(result.data.confidence);
      // Single uncontrolled field — a direct imperative set is simpler than
      // remounting the whole form the way BillFormFields does (MAD-103) for
      // its many fields.
      if (result.data.value && valueInputRef.current) {
        valueInputRef.current.value = result.data.value;
      }
    });
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await addMeterReading(utilityId, null, formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      // Same FormData, reused: addMeterReading ignored its "file" field,
      // uploadAttachment only reads that one. Upload failure doesn't roll
      // back the reading — it already saved successfully. The photo attaches
      // here regardless of whether scanning ran or succeeded.
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
      setScanError(null);
      setScanConfidence(null);
      formRef.current?.reset();
      onSuccess?.();
    });
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form ref={formRef} action={handleSubmit} className="flex flex-col gap-4">
      <FieldGroup>
        <AttachmentUploadField label="Meter photo" inputRef={fileInputRef} />
        <div className="flex flex-col gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleScan}
            disabled={scanning}
            className="self-start"
          >
            {scanning ? "Scanning…" : "Scan with AI"}
          </Button>
          {scanError && <FieldError>{scanError}</FieldError>}
          {scanConfidence && (
            <p className={cn("text-xs", scanConfidence === "low" ? "text-destructive" : "text-muted-foreground")}>
              AI-suggested ({scanConfidence} confidence) — confirm or edit the reading below before
              saving.
            </p>
          )}
        </div>
        <Field orientation="responsive">
          <FieldLabel htmlFor="value">Reading ({unit})</FieldLabel>
          <Input ref={valueInputRef} id="value" name="value" type="number" step="any" inputMode="decimal" required />
        </Field>
        <Field orientation="responsive">
          <FieldLabel htmlFor="readingDate">Date</FieldLabel>
          <Input id="readingDate" name="readingDate" type="date" defaultValue={today} required />
        </Field>
        <Field>
          <FieldLabel htmlFor="notes">Notes</FieldLabel>
          <Textarea id="notes" name="notes" rows={2} />
        </Field>
      </FieldGroup>
      {error && <FieldError>{error}</FieldError>}
      <Button type="submit" disabled={pending} size="lg" className="w-full md:w-auto md:self-start">
        {pending ? "Saving…" : "Add reading"}
      </Button>
    </form>
  );
}
