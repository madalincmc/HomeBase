import { PageHeader } from "@/components/shell/page-header";
import { RoomList } from "@/components/rooms/room-list";
import { AddRoomForm } from "@/components/rooms/add-room-form";
import { getHouseholdRooms } from "@/lib/rooms/get-rooms";

// Reads live household data — see the MAD-91 note in CLAUDE.md.
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const rooms = await getHouseholdRooms();

  return (
    <>
      <PageHeader
        title="Settings"
        description="Household name and notification preferences will show up here."
      />
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <div>
          <h2 className="text-sm font-semibold">Rooms</h2>
          <p className="text-sm text-muted-foreground">
            Used to optionally tag chores and maintenance items with a place in the house.
          </p>
        </div>
        <RoomList rooms={rooms} />
        <AddRoomForm existingNames={rooms.map((r) => r.name)} />
      </div>
    </>
  );
}
