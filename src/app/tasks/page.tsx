import { PageHeader } from "@/components/shell/page-header";
import { ChoreCard } from "@/components/chores/chore-card";
import { CreateChoreDialog } from "@/components/chores/create-chore-dialog";
import { RoomFilter } from "@/components/rooms/room-filter";
import { getChores } from "@/lib/chores/get-chores";
import { getHouseholdRooms } from "@/lib/rooms/get-rooms";
import { formatDateOnlyLabel, todayDateOnly } from "@/lib/schedule";

// Reads live household data — see the MAD-91 note in CLAUDE.md.
export const dynamic = "force-dynamic";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string }>;
}) {
  const { room } = await searchParams;
  const [{ chores, scheduleById }, rooms] = await Promise.all([
    getChores({ roomId: room }),
    getHouseholdRooms(),
  ]);
  // Derived from the date rather than stored, same convention as
  // getBillDisplayStatus() — a stored flag would go stale the moment a day
  // rolls over with no write.
  const today = todayDateOnly();

  return (
    <>
      <PageHeader title="Tasks" description="Recurring household chores." />
      <div className="flex flex-wrap items-end justify-between gap-3 p-4 md:px-6 md:py-4">
        {rooms.length > 0 ? (
          <RoomFilter rooms={rooms} selected={room ?? "all"} basePath="/tasks" />
        ) : (
          <div />
        )}
        <CreateChoreDialog rooms={rooms} />
      </div>

      {chores.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted-foreground md:px-6">
          No chores yet — add one to start tracking household tasks.
        </p>
      ) : (
        <div className="divide-y border-y">
          {chores.map(({ chore, roomName, pendingOccurrence, lastCompletedOccurrence }) => {
            const meta = [
              roomName,
              chore.assignee,
              chore.estimatedDurationMinutes ? `${chore.estimatedDurationMinutes} min` : null,
              lastCompletedOccurrence
                ? `Last done ${formatDateOnlyLabel(lastCompletedOccurrence.scheduledFor)}`
                : null,
            ].filter((entry): entry is string => Boolean(entry));

            return (
              <ChoreCard
                key={chore.id}
                chore={chore}
                schedule={chore.scheduleId ? (scheduleById.get(chore.scheduleId) ?? null) : null}
                rooms={rooms}
                dueDate={pendingOccurrence?.scheduledFor ?? chore.nextDueDate ?? ""}
                dueLabel={
                  pendingOccurrence ? formatDateOnlyLabel(pendingOccurrence.scheduledFor) : null
                }
                isOverdue={Boolean(pendingOccurrence && pendingOccurrence.scheduledFor < today)}
                occurrenceId={pendingOccurrence?.id ?? null}
                meta={meta}
              />
            );
          })}
        </div>
      )}
    </>
  );
}
