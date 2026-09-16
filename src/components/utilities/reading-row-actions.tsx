"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditReadingDialog } from "./edit-reading-dialog";
import { DeleteReadingDialog } from "./delete-reading-dialog";
import type { AddReadingMeterPoint } from "./add-reading-form";

export function ReadingRowActions({
  readingId,
  unit,
  label,
  hasAttachments,
  defaultValues,
  meterPoints,
}: {
  readingId: string;
  unit: string;
  label: string;
  hasAttachments: boolean;
  defaultValues: {
    value: string;
    readingDate: string;
    notes: string | null;
    meterPointId: string | null;
  };
  meterPoints?: AddReadingMeterPoint[];
}) {
  // Same shape as ChoreCard: the menu item is the trigger, so both dialogs
  // run controlled and stay mounted rather than being rendered per
  // selection — mounting on selection cuts off Radix's close animation.
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`More actions for ${label}`}>
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

      <EditReadingDialog
        readingId={readingId}
        unit={unit}
        defaultValues={defaultValues}
        meterPoints={meterPoints}
        open={editOpen}
        onOpenChange={setEditOpen}
        trigger={false}
      />
      <DeleteReadingDialog
        readingId={readingId}
        label={label}
        hasAttachments={hasAttachments}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        trigger={false}
      />
    </>
  );
}
