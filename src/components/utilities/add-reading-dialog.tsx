"use client";

import { useState } from "react";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AddReadingForm } from "./add-reading-form";
import type { QuickActionUtility } from "@/lib/quick-actions/get-quick-action-context";

export function AddReadingDialog({
  utilities,
  open,
  onOpenChange,
}: {
  utilities: QuickActionUtility[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Reset the picker step whenever freshly opened/closed, without an
  // effect: this "adjust state during render in response to a prop change"
  // pattern is the React-docs-recommended alternative to a useEffect for
  // exactly this case (https://react.dev/reference/react/useState#storing-information-from-previous-renders).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSelectedId(utilities.length === 1 ? utilities[0].id : null);
  }

  const selected = utilities.find((u) => u.id === selectedId) ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add meter reading</DialogTitle>
        </DialogHeader>
        {utilities.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No utilities yet — add one from the Utilities page first.
          </p>
        ) : selected ? (
          <AddReadingForm utilityId={selected.id} unit={selected.unit} onSuccess={() => onOpenChange(false)} />
        ) : (
          <div className="flex flex-col gap-2">
            {utilities.map((utility) => (
              <Button
                key={utility.id}
                variant="outline"
                size="lg"
                className="justify-start gap-3"
                onClick={() => setSelectedId(utility.id)}
              >
                <Zap className="size-4" />
                <span className="capitalize">{utility.type} reading</span>
              </Button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
