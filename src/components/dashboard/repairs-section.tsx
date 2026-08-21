import Link from "next/link";
import { Hammer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RepairStatusBadge } from "@/components/repairs/repair-status-badge";
import type { OpenRepairSummary } from "@/lib/repairs/get-repairs";

const PRIORITY_VARIANT = {
  low: "outline",
  medium: "secondary",
  high: "destructive",
} as const;

// Repairs have no due date, so unlike the other dashboard sections (all
// backed by DashboardSection/DueItem's date-bucketed shape) this is its own
// small component rather than a reused one — see the MAD-110 note in
// CLAUDE.md.
export function RepairsSection({ repairs, className }: { repairs: OpenRepairSummary[]; className?: string }) {
  return (
    <section className={className}>
      <div className="px-4 pt-4 pb-2 md:px-6">
        <h2 className="text-sm font-semibold">Repairs</h2>
        <p className="text-xs text-muted-foreground">Open</p>
      </div>
      {repairs.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted-foreground md:px-6">No open repairs.</p>
      ) : (
        <div className="divide-y border-y">
          {repairs.map((repair) => (
            <Link
              key={repair.id}
              href="/repairs"
              className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted md:px-6"
            >
              <Hammer className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate font-medium">{repair.title}</span>
              <Badge variant={PRIORITY_VARIANT[repair.priority]}>{repair.priority}</Badge>
              <RepairStatusBadge status={repair.status} />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
