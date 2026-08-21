"use client";

import { useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/components/ui/field";
import { createRoom } from "@/lib/rooms/actions";
import { DEFAULT_ROOM_SUGGESTIONS } from "@/lib/rooms/default-rooms";

// A single-field form doesn't need a modal the way the bill/chore/
// maintenance create dialogs do — those have 5+ fields, this has one.
export function AddRoomForm({ existingNames }: { existingNames: string[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const existingLower = new Set(existingNames.map((n) => n.toLowerCase()));
  const suggestions = DEFAULT_ROOM_SUGGESTIONS.filter((name) => !existingLower.has(name.toLowerCase()));

  function submitName(name: string) {
    const formData = new FormData();
    formData.set("name", name);
    startTransition(async () => {
      const result = await createRoom(null, formData);
      if (result.success) {
        setError(null);
        formRef.current?.reset();
      } else {
        setError(result.error);
      }
    });
  }

  function handleSubmit(formData: FormData) {
    submitName(String(formData.get("name") ?? ""));
  }

  return (
    <div className="flex flex-col gap-3">
      <form ref={formRef} action={handleSubmit} className="flex items-end gap-2">
        <Input name="name" placeholder="Room name" required disabled={pending} className="max-w-xs" />
        <Button type="submit" disabled={pending}>
          <Plus className="size-4" />
          Add room
        </Button>
      </form>
      {error && <FieldError>{error}</FieldError>}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Quick add:</span>
          {suggestions.map((name) => (
            <Button
              key={name}
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => submitName(name)}
            >
              {name}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
