import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { CreateMaintenanceDialog } from "@/components/maintenance/create-maintenance-dialog";
import { EditMaintenanceDialog } from "@/components/maintenance/edit-maintenance-dialog";
import { DeleteMaintenanceDialog } from "@/components/maintenance/delete-maintenance-dialog";
import { CompleteMaintenanceDialog } from "@/components/maintenance/complete-maintenance-dialog";
import { SkipMaintenanceButton } from "@/components/maintenance/skip-maintenance-button";
import { getMaintenanceItems, getHouseholdRooms } from "@/lib/maintenance/get-maintenance";
import { formatDateOnlyLabel } from "@/lib/schedule";

// Reads live household data — see the MAD-91 note in CLAUDE.md.
export const dynamic = "force-dynamic";

const PRIORITY_VARIANT = {
  low: "outline",
  medium: "secondary",
  high: "destructive",
} as const;

export default async function MaintenancePage() {
  const [{ items, scheduleById, attachmentsByItem }, rooms] = await Promise.all([
    getMaintenanceItems(),
    getHouseholdRooms(),
  ]);

  return (
    <>
      <PageHeader title="Maintenance" description="Recurring home and appliance maintenance." />
      <div className="flex justify-end p-4 md:p-6">
        <CreateMaintenanceDialog rooms={rooms} />
      </div>

      {items.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted-foreground md:px-6">
          No maintenance items yet — add one to start tracking upkeep.
        </p>
      ) : (
        <div className="divide-y border-y">
          {items.map(({ item, roomName, pendingOccurrence }) => (
            <div key={item.id} className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:px-6">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{item.title}</span>
                  <Badge variant={PRIORITY_VARIANT[item.priority]}>{item.priority}</Badge>
                </div>
                <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                  {item.category && <span>{item.category}</span>}
                  {roomName && <span>{roomName}</span>}
                  {item.relatedAppliance && <span>{item.relatedAppliance}</span>}
                  {item.estimatedCost && <span>Est. {item.estimatedCost}</span>}
                  {item.lastCompletedAt && (
                    <span>Last completed {formatDateOnlyLabel(item.lastCompletedAt)}</span>
                  )}
                </div>
              </div>

              {pendingOccurrence ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    Due {formatDateOnlyLabel(pendingOccurrence.scheduledFor)}
                  </span>
                  <SkipMaintenanceButton occurrenceId={pendingOccurrence.id} />
                  <CompleteMaintenanceDialog
                    occurrenceId={pendingOccurrence.id}
                    itemId={item.id}
                    title={item.title}
                  />
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">No occurrence scheduled</span>
              )}

              <div className="flex items-center gap-2">
                <EditMaintenanceDialog
                  item={item}
                  schedule={item.scheduleId ? (scheduleById.get(item.scheduleId) ?? null) : null}
                  rooms={rooms}
                  dueDate={pendingOccurrence?.scheduledFor ?? item.nextDueDate ?? ""}
                  attachments={attachmentsByItem.get(item.id) ?? []}
                />
                <DeleteMaintenanceDialog itemId={item.id} title={item.title} />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
