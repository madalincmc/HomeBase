"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { skipMaintenanceOccurrence } from "@/lib/maintenance/actions";

export function SkipMaintenanceButton({ occurrenceId }: { occurrenceId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSkip() {
    startTransition(async () => {
      const result = await skipMaintenanceOccurrence(occurrenceId);
      setError(result.success ? null : result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" size="sm" disabled={pending} onClick={handleSkip}>
        Skip
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
