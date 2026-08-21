"use client";

import Form from "next/form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Room } from "@/lib/rooms/get-rooms";

// Same next/form GET pattern as MAD-99's HistoryFilters — a real navigation
// with search params, not client state, so it needs zero JS beyond what
// Select itself already requires.
export function RoomFilter({
  rooms,
  selected,
  basePath,
}: {
  rooms: Room[];
  selected: string;
  basePath: "/tasks" | "/maintenance";
}) {
  return (
    <Form action={basePath} className="flex items-end gap-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="room">Room</Label>
        <Select name="room" defaultValue={selected}>
          <SelectTrigger id="room" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All rooms</SelectItem>
            {rooms.map((room) => (
              <SelectItem key={room.id} value={room.id}>
                {room.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" variant="outline" size="sm">
        Filter
      </Button>
      {selected !== "all" && (
        <Button variant="ghost" size="sm" asChild>
          <a href={basePath}>Reset</a>
        </Button>
      )}
    </Form>
  );
}
