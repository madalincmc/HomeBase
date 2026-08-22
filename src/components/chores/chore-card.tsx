"use client";

import { useState } from "react";
import { CalendarClock, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditChoreDialog } from "./edit-chore-dialog";
import { DeleteChoreDialog } from "./delete-chore-dialog";
import { OccurrenceActions } from "./occurrence-actions";
import type { ChoreFormRoomOption } from "./chore-form-fields";
import type { chores, schedules } from "@/db/schema";

type Chore = typeof chores.$inferSelect;
type Schedule = typeof schedules.$inferSelect;

const PRIORITY_VARIANT = {
  low: "outline",
  medium: "secondary",
  high: "destructive",
} as const;

export function ChoreCard({
  chore,
  schedule,
  rooms,
  dueDate,
  dueLabel,
  isOverdue,
  occurrenceId,
  meta,
}: {
  chore: Chore;
  schedule: Schedule | null;
  rooms: ChoreFormRoomOption[];
  dueDate: string;
  // Preformatted on the server: formatDateOnlyLabel pins to UTC on purpose,
  // and reformatting here would reintroduce the local-timezone drift the
  // DateOnly helpers exist to avoid.
  dueLabel: string | null;
  isOverdue: boolean;
  occurrenceId: string | null;
  meta: string[];
}) {
  // Edit/Delete are demoted into an overflow menu, so the dialogs can no
  // longer own their own triggers — the menu item is the trigger. Both are
  // always mounted rather than rendered per selection, so Radix can play its
  // own close animation (same reasoning as the quick-actions menu, MAD-100).
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-muted/40 md:flex-row md:items-center md:gap-6 md:px-6">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{chore.title}</span>
          <Badge variant={PRIORITY_VARIANT[chore.priority]} className="shrink-0">
            {chore.priority}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {dueLabel ? (
            <span
              className={`inline-flex items-center gap-1 ${isOverdue ? "font-medium text-destructive" : ""}`}
            >
              <CalendarClock className="size-3.5" />
              Due {dueLabel}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="size-3.5" />
              Not scheduled
            </span>
          )}
          {/* Dot separators rather than a wrapping gap-x row: the metadata is
              a single sentence-like line, and bare gaps read as unrelated
              fragments once two or three of them wrap. */}
          {meta.map((entry) => (
            <span key={entry} className="inline-flex items-center gap-2">
              <span aria-hidden className="text-muted-foreground/40">
                ·
              </span>
              {entry}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {occurrenceId ? (
          <OccurrenceActions occurrenceId={occurrenceId} />
        ) : (
          // Keeps the overflow button on the same right-hand alignment axis
          // as every other card, instead of letting it slide left when a
          // chore has no pending occurrence.
          <span className="flex-1 md:flex-none" />
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`More actions for ${chore.title}`}>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setEditOpen(true)}>
              <Pencil />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <EditChoreDialog
        chore={chore}
        schedule={schedule}
        rooms={rooms}
        dueDate={dueDate}
        open={editOpen}
        onOpenChange={setEditOpen}
        trigger={false}
      />
      <DeleteChoreDialog
        choreId={chore.id}
        title={chore.title}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        trigger={false}
      />
    </div>
  );
}
