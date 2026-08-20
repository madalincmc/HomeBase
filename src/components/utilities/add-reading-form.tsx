"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldError, FieldGroup, FieldDescription } from "@/components/ui/field";
import { addMeterReading } from "@/lib/utilities/actions";

export function AddReadingForm({ utilityId, unit }: { utilityId: string; unit: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await addMeterReading(utilityId, null, formData);
      if (result.success) {
        setError(null);
        formRef.current?.reset();
      } else {
        setError(result.error);
      }
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
        <FieldDescription>Photo attachments aren&apos;t available yet.</FieldDescription>
      </FieldGroup>
      {error && <FieldError>{error}</FieldError>}
      <Button type="submit" disabled={pending} size="lg" className="w-full md:w-auto md:self-start">
        {pending ? "Saving…" : "Add reading"}
      </Button>
    </form>
  );
}
