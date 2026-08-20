import type { DashboardItem } from "@/lib/dashboard/get-dashboard-data";
import { DashboardItemRow } from "./dashboard-item-row";

export function DashboardSection({
  title,
  description,
  items,
  severity,
  emptyMessage,
  className,
}: {
  title: string;
  description?: string;
  items: DashboardItem[];
  severity: "overdue" | "today" | "upcoming";
  emptyMessage: string;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="px-4 pt-4 pb-2 md:px-6">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {items.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted-foreground md:px-6">{emptyMessage}</p>
      ) : (
        <div className="divide-y border-y">
          {items.map((item) => (
            <DashboardItemRow key={`${item.kind}-${item.id}`} item={item} severity={severity} />
          ))}
        </div>
      )}
    </section>
  );
}
