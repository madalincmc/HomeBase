import { Badge } from "@/components/ui/badge";
import type { BillDisplayStatus } from "@/lib/bills/status";

const LABEL: Record<BillDisplayStatus, string> = {
  paid: "Paid",
  overdue: "Overdue",
  dueToday: "Due today",
  upcoming: "Upcoming",
};

const VARIANT: Record<BillDisplayStatus, "default" | "outline" | "destructive" | "secondary"> = {
  paid: "secondary",
  overdue: "destructive",
  dueToday: "default",
  upcoming: "outline",
};

export function BillStatusBadge({ status }: { status: BillDisplayStatus }) {
  return <Badge variant={VARIANT[status]}>{LABEL[status]}</Badge>;
}
