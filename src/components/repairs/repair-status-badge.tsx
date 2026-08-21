import { Badge } from "@/components/ui/badge";

type RepairStatus = "open" | "in_progress" | "waiting" | "resolved";

const LABEL: Record<RepairStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  waiting: "Waiting",
  resolved: "Resolved",
};

const VARIANT: Record<RepairStatus, "default" | "outline" | "secondary"> = {
  open: "outline",
  in_progress: "default",
  waiting: "secondary",
  resolved: "secondary",
};

export function RepairStatusBadge({ status }: { status: RepairStatus }) {
  return <Badge variant={VARIANT[status]}>{LABEL[status]}</Badge>;
}
