import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDateOnlyLabel } from "@/lib/schedule";
import { CATEGORY_ICON } from "@/lib/category";
import type { DashboardItem } from "@/lib/dashboard/get-dashboard-data";

export function DashboardItemRow({
  item,
  severity,
}: {
  item: DashboardItem;
  severity: "overdue" | "today" | "upcoming";
}) {
  const Icon = CATEGORY_ICON[item.kind];

  return (
    <Link
      href={item.href}
      className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted md:px-6"
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{item.title}</span>
        {item.meta && <span className="truncate text-xs text-muted-foreground">{item.meta}</span>}
      </div>
      <Badge variant={severity === "overdue" ? "destructive" : "outline"}>
        {formatDateOnlyLabel(item.dueDate)}
      </Badge>
    </Link>
  );
}
