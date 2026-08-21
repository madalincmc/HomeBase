import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { CreateRepairDialog } from "@/components/repairs/create-repair-dialog";
import { EditRepairDialog } from "@/components/repairs/edit-repair-dialog";
import { ResolveRepairDialog } from "@/components/repairs/resolve-repair-dialog";
import { DeleteRepairDialog } from "@/components/repairs/delete-repair-dialog";
import { RepairStatusBadge } from "@/components/repairs/repair-status-badge";
import { AttachmentList } from "@/components/attachments/attachment-list";
import { getRepairs } from "@/lib/repairs/get-repairs";
import { formatDateOnlyLabel } from "@/lib/schedule";

// Reads live household data — see the MAD-91 note in CLAUDE.md.
export const dynamic = "force-dynamic";

const PRIORITY_VARIANT = {
  low: "outline",
  medium: "secondary",
  high: "destructive",
} as const;

export default async function RepairsPage() {
  const { repairs, attachmentsByRepair } = await getRepairs();

  return (
    <>
      <PageHeader title="Repairs" description="Household problems that aren't recurring maintenance." />
      <div className="flex justify-end p-4 md:p-6">
        <CreateRepairDialog />
      </div>

      {repairs.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted-foreground md:px-6">
          No repairs reported yet.
        </p>
      ) : (
        <div className="divide-y border-y">
          {repairs.map((repair) => (
            <div key={repair.id} className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:px-6">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{repair.title}</span>
                  <Badge variant={PRIORITY_VARIANT[repair.priority]}>{repair.priority}</Badge>
                  <RepairStatusBadge status={repair.status} />
                </div>
                {repair.description && (
                  <p className="text-xs text-muted-foreground">{repair.description}</p>
                )}
                <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                  <span>Reported {formatDateOnlyLabel(repair.reportedDate)}</span>
                  {repair.repairedDate && <span>Repaired {formatDateOnlyLabel(repair.repairedDate)}</span>}
                  {repair.contractor && <span>{repair.contractor}</span>}
                  {repair.cost && <span>{repair.cost}</span>}
                </div>
                {(attachmentsByRepair.get(repair.id) ?? []).length > 0 && (
                  <div className="md:w-64">
                    <AttachmentList attachments={attachmentsByRepair.get(repair.id) ?? []} revalidatePaths={["/repairs", "/"]} />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {repair.status !== "resolved" && <ResolveRepairDialog repairId={repair.id} title={repair.title} />}
                <EditRepairDialog repair={repair} attachments={attachmentsByRepair.get(repair.id) ?? []} />
                <DeleteRepairDialog repairId={repair.id} title={repair.title} />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
