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
    // flex-1 on mobile so Skip/Complete split the row into two equal, wide
    // tap targets; intrinsic width on desktop, where the card is a single
    // row and the buttons sit against the right edge.
    <div className="flex min-w-0 flex-1 flex-col gap-1 md:flex-none">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 md:flex-none"
          disabled={pending}
          onClick={() => handle(skipChoreOccurrence)}
        >
          Skip
        </Button>
        <Button
          size="sm"
          className="flex-1 md:flex-none"
          disabled={pending}
          onClick={() => handle(completeChoreOccurrence)}
        >
          Complete
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
