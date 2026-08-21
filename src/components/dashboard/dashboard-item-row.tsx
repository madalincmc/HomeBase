import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDateOnlyLabel } from "@/lib/schedule";
import { CATEGORY_ICON } from "@/lib/category";
import type { DashboardItem, DashboardItemKind } from "@/lib/dashboard/get-dashboard-data";

// Extends CATEGORY_ICON (from src/lib/category.ts) with "warranty" rather
// than adding it to that shared map — CATEGORY_ICON also backs History's
// category filter, and warranty expirations are never logged as an
// activity, so History should never gain a "Warranty" option with no
// possible matches. See the MAD-109 note in CLAUDE.md.
const ICON_BY_KIND: Record<DashboardItemKind, typeof ShieldCheck> = {
  ...CATEGORY_ICON,
  warranty: ShieldCheck,
};

export function DashboardItemRow({
  item,
  severity,
}: {
  item: DashboardItem;
  severity: "overdue" | "today" | "upcoming";
}) {
  const Icon = ICON_BY_KIND[item.kind];

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
