"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field";
import { ScanCaptureField, type ScanCaptureFieldHandle } from "@/components/attachments/scan-capture-field";
import { addMeterReading } from "@/lib/utilities/actions";
import { uploadAttachment } from "@/lib/attachments/actions";
import { extractMeterReading, type ExtractedReading } from "@/lib/utilities/extract-reading";

export type AddReadingMeterPoint = { id: string; name: string };

function scanAction(file: File) {
  const formData = new FormData();
  formData.set("file", file);
  return extractMeterReading(null, formData);
}

const RESULT_CAPTION = (confidence: "high" | "medium" | "low") =>
  `AI-suggested (${confidence} confidence) — confirm or edit the reading below before saving.`;

async function submitOneReading(
  utilityId: string,
  formData: FormData
): Promise<{ success: true } | { success: false; error: string }> {
  const result = await addMeterReading(utilityId, null, formData);
  if (!result.success) return result;
  // Same FormData, reused: addMeterReading ignored its "file" field,
  // uploadAttachment only reads that one. Upload failure doesn't roll back
  // the reading — it already saved successfully.
  return uploadAttachment({ meterReadingId: result.readingId }, [`/utilities/${utilityId}`], null, formData);
}

export function AddReadingForm({
  utilityId,
  unit,
  meterPoints = [],
  onSuccess,
}: {
  utilityId: string;
  unit: string;
  // A utility with named meter points (water's multiple-taps case, see
  // CLAUDE.md) needs one value + one photo per point instead of a single
  // reading — empty for every other utility, which keeps the single-reading
  // form below completely unchanged.
  meterPoints?: AddReadingMeterPoint[];
  // Optional: the utility detail page embeds this form inline and just
  // resets it to add another reading, but the quick-actions dialog (MAD-100)
  // needs to close itself afterward — called once every reading (and any
  // attachment) has saved successfully.
  onSuccess?: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  // Single-reading mode's own refs — untouched when meterPoints is non-empty.
  const valueInputRef = useRef<HTMLInputElement>(null);
  const scanFieldRef = useRef<ScanCaptureFieldHandle>(null);

  // Multi-point mode's refs, one per point keyed by meter point id — a plain
  // Map rather than N individual useRef calls, since the number of points is
  // data-driven, not fixed.
  const pointValueInputs = useRef(new Map<string, HTMLInputElement>());
  const pointScanFields = useRef(new Map<string, ScanCaptureFieldHandle>());

  function handleReadingScanned(data: ExtractedReading | null) {
    // Single uncontrolled field — a direct imperative set is simpler than
    // remounting the whole form the way BillFormFields does (MAD-103) for
    // its many fields.
    if (data?.value && valueInputRef.current) {
      valueInputRef.current.value = data.value;
    }
  }

  function handlePointScanned(pointId: string, data: ExtractedReading | null) {
    const input = pointValueInputs.current.get(pointId);
    if (data?.value && input) {
      input.value = data.value;
    }
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      if (meterPoints.length === 0) {
        const result = await submitOneReading(utilityId, formData);
        if (!result.success) {
          setError(result.error);
          return;
        }
        setError(null);
        formRef.current?.reset();
        scanFieldRef.current?.reset();
        onSuccess?.();
        return;
      }

      // Multi-point: one insert + one upload per point, sharing the same
      // date/notes. Not wrapped in a single DB transaction across the
      // sequential calls — same non-atomic-but-recoverable trade-off already
      // accepted elsewhere in this app (e.g. a reading whose photo upload
      // fails still keeps the reading). If one point's insert fails partway
      // through, the points before it in the list have already saved.
      const readingDate = String(formData.get("readingDate") ?? "");
      const notes = formData.get("notes");
      for (const point of meterPoints) {
        const pointFormData = new FormData();
        pointFormData.set("value", String(formData.get(`value-${point.id}`) ?? ""));
        pointFormData.set("readingDate", readingDate);
        if (typeof notes === "string" && notes) pointFormData.set("notes", notes);
        pointFormData.set("meterPointId", point.id);
        const file = formData.get(`file-${point.id}`);
        if (file instanceof File && file.size > 0) pointFormData.set("file", file);

        const result = await submitOneReading(utilityId, pointFormData);
        if (!result.success) {
          setError(`${point.name}: ${result.error}`);
          return;
        }
      }
      setError(null);
      formRef.current?.reset();
      for (const handle of pointScanFields.current.values()) handle.reset();
      onSuccess?.();
    });
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form ref={formRef} action={handleSubmit} className="flex flex-col gap-4">
      <FieldGroup>
        {meterPoints.length === 0 ? (
          <>
            <ScanCaptureField<ExtractedReading>
              ref={scanFieldRef}
              label="Scan the meter"
              hint="We'll read the value automatically"
              scanAction={scanAction}
              onScanned={handleReadingScanned}
              resultCaption={RESULT_CAPTION}
            />
            <Field orientation="responsive">
              <FieldLabel htmlFor="value">Reading ({unit})</FieldLabel>
              <Input
                ref={valueInputRef}
                id="value"
                name="value"
                type="number"
                step="any"
                inputMode="decimal"
                required
              />
            </Field>
          </>
        ) : (
          meterPoints.map((point) => (
            <div key={point.id} className="flex flex-col gap-3 rounded-lg border p-3">
              <p className="text-sm font-medium">{point.name}</p>
              <ScanCaptureField<ExtractedReading>
                ref={(handle) => {
                  if (handle) pointScanFields.current.set(point.id, handle);
                  else pointScanFields.current.delete(point.id);
                }}
                name={`file-${point.id}`}
                label={`Scan ${point.name}`}
                hint="We'll read the value automatically"
                scanAction={scanAction}
                onScanned={(data) => handlePointScanned(point.id, data)}
                resultCaption={RESULT_CAPTION}
              />
              <Field orientation="responsive">
                <FieldLabel htmlFor={`value-${point.id}`}>Reading ({unit})</FieldLabel>
                <Input
                  ref={(el) => {
                    if (el) pointValueInputs.current.set(point.id, el);
                    else pointValueInputs.current.delete(point.id);
                  }}
                  id={`value-${point.id}`}
                  name={`value-${point.id}`}
                  type="number"
                  step="any"
                  inputMode="decimal"
                  required
                />
              </Field>
            </div>
          ))
        )}
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
        {pending ? "Saving…" : meterPoints.length > 0 ? "Add readings" : "Add reading"}
      </Button>
    </form>
  );
}
