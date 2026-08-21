import { CATEGORY_ICON } from "@/lib/category";
import { formatActivityTimestamp } from "@/lib/activities/format";
import type { ActivityHistoryEntry } from "@/lib/activities/get-activity-history";

export function ActivityList({ activity }: { activity: ActivityHistoryEntry[] }) {
  if (activity.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-muted-foreground md:px-6">
        No activity matches these filters.
      </p>
    );
  }

  return (
    <ul className="divide-y">
      {activity.map((entry) => {
        const Icon = CATEGORY_ICON[entry.category];
        return (
          <li key={entry.id} className="flex items-center gap-3 px-4 py-3 text-sm md:px-6">
            <Icon className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">{entry.description}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatActivityTimestamp(entry.occurredAt)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
