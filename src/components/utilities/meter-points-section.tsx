"use client";

import { useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/components/ui/field";
import { createMeterPoint } from "@/lib/utilities/meter-point-actions";
import { DeleteMeterPointDialog } from "./delete-meter-point-dialog";

// Restricted to water on the utility detail page (see the call site) — a
// utility with no points behaves exactly as it always has, and this is the
// only place a household turns multi-point reading entry on. Not gated at
// the schema/action level, only here, matching the household's actual need
// (several water taps to read each visit) rather than every utility type.
export function MeterPointsSection({
  utilityId,
  meterPoints,
}: {
  utilityId: string;
  meterPoints: { id: string; name: string }[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createMeterPoint(utilityId, null, formData);
      if (result.success) {
        setError(null);
        formRef.current?.reset();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold">Meter points</h2>
      <p className="mb-3 text-sm text-muted-foreground">
        Add a named point for each physical meter you read — once at least one exists, the reading
        form below asks for one value and photo per point instead of a single reading.
      </p>
      {meterPoints.length > 0 && (
        <ul className="mb-3 flex flex-col gap-1.5">
          {meterPoints.map((point) => (
            <li
              key={point.id}
              className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
            >
              <span>{point.name}</span>
              <DeleteMeterPointDialog utilityId={utilityId} meterPointId={point.id} name={point.name} />
            </li>
          ))}
        </ul>
      )}
      <form ref={formRef} action={handleSubmit} className="flex items-end gap-2">
        <Input name="name" placeholder="e.g. Kitchen" required disabled={pending} className="max-w-xs" />
        <Button type="submit" disabled={pending}>
          <Plus className="size-4" />
          Add point
        </Button>
      </form>
      {error && <FieldError>{error}</FieldError>}
    </section>
  );
}
