import { EditRoomDialog } from "./edit-room-dialog";
import { DeleteRoomDialog } from "./delete-room-dialog";
import type { Room } from "@/lib/rooms/get-rooms";

export function RoomList({ rooms }: { rooms: Room[] }) {
  if (rooms.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No rooms yet — add one below to start assigning chores and maintenance to a place.
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-lg border">
      {rooms.map((room) => (
        <li key={room.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
          <span>{room.name}</span>
          <div className="flex items-center gap-1">
            <EditRoomDialog room={room} />
            <DeleteRoomDialog roomId={room.id} name={room.name} />
          </div>
        </li>
      ))}
    </ul>
  );
}
