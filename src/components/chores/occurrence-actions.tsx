"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { completeChoreOccurrence, skipChoreOccurrence } from "@/lib/chores/actions";

export function OccurrenceActions({ occurrenceId }: { occurrenceId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handle(action: typeof completeChoreOccurrence | typeof skipChoreOccurrence) {
    startTransition(async () => {
      const result = await action(occurrenceId);
      setError(result.success ? null : result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={pending} onClick={() => handle(skipChoreOccurrence)}>
          Skip
        </Button>
        <Button size="sm" disabled={pending} onClick={() => handle(completeChoreOccurrence)}>
          Complete
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
