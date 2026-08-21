import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { CreateChoreDialog } from "@/components/chores/create-chore-dialog";
import { EditChoreDialog } from "@/components/chores/edit-chore-dialog";
import { DeleteChoreDialog } from "@/components/chores/delete-chore-dialog";
import { OccurrenceActions } from "@/components/chores/occurrence-actions";
import { RoomFilter } from "@/components/rooms/room-filter";
import { getChores } from "@/lib/chores/get-chores";
import { getHouseholdRooms } from "@/lib/rooms/get-rooms";
import { formatDateOnlyLabel } from "@/lib/schedule";

// Reads live household data — see the MAD-91 note in CLAUDE.md.
export const dynamic = "force-dynamic";

const PRIORITY_VARIANT = {
  low: "outline",
  medium: "secondary",
  high: "destructive",
} as const;

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
          {chores.map(({ chore, roomName, pendingOccurrence, lastCompletedOccurrence }) => (
            <div key={chore.id} className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:px-6">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{chore.title}</span>
                  <Badge variant={PRIORITY_VARIANT[chore.priority]}>{chore.priority}</Badge>
                </div>
                <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                  {roomName && <span>{roomName}</span>}
                  {chore.assignee && <span>{chore.assignee}</span>}
                  {chore.estimatedDurationMinutes && <span>{chore.estimatedDurationMinutes} min</span>}
                  {lastCompletedOccurrence && (
                    <span>Last completed {formatDateOnlyLabel(lastCompletedOccurrence.scheduledFor)}</span>
                  )}
                </div>
              </div>

              {pendingOccurrence ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    Due {formatDateOnlyLabel(pendingOccurrence.scheduledFor)}
                  </span>
                  <OccurrenceActions occurrenceId={pendingOccurrence.id} />
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">No occurrence scheduled</span>
              )}

              <div className="flex items-center gap-2">
                <EditChoreDialog
                  chore={chore}
                  schedule={chore.scheduleId ? (scheduleById.get(chore.scheduleId) ?? null) : null}
                  rooms={rooms}
                  dueDate={pendingOccurrence?.scheduledFor ?? chore.nextDueDate ?? ""}
                />
                <DeleteChoreDialog choreId={chore.id} title={chore.title} />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
