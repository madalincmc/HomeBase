"use client";

import Form from "next/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Room } from "@/lib/rooms/get-rooms";

// Same next/form GET-navigation pattern as DocumentFilters (MAD-107),
// HistoryFilters (MAD-99), and RoomFilter (MAD-97).
export function InventoryFilters({
  q,
  category,
  roomId,
  categories,
  rooms,
}: {
  q: string;
  category: string;
  roomId: string;
  categories: string[];
  rooms: Room[];
}) {
  const hasFilters = q !== "" || category !== "all" || roomId !== "all";

  return (
    <Form action="/inventory" className="flex flex-wrap items-end gap-3 border-b px-4 py-4 md:px-6">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="q">Search</Label>
        <Input id="q" name="q" placeholder="Name, brand, model, serial…" defaultValue={q} className="w-56" />
      </div>
      {categories.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category">Category</Label>
          <Select name="category" defaultValue={category}>
            <SelectTrigger id="category" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {rooms.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="room">Area</Label>
          <Select name="room" defaultValue={roomId}>
            <SelectTrigger id="room" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All areas</SelectItem>
              {rooms.map((room) => (
                <SelectItem key={room.id} value={room.id}>
                  {room.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <Button type="submit">Filter</Button>
      {hasFilters && (
        <Button variant="ghost" asChild>
          <a href="/inventory">Reset</a>
        </Button>
      )}
    </Form>
  );
}
