import { CATEGORY_ICON } from "@/lib/category";
import { formatActivityTimestamp } from "@/lib/activities/format";
import type { ActivityHistoryEntry } from "@/lib/activities/get-activity-history";

export function ActivityList({
  activity,
  hasFilters = false,
}: {
  activity: ActivityHistoryEntry[];
  // An empty list means two very different things — "your filters excluded
  // everything" vs. "nothing has ever happened" — and this component can't
  // tell them apart on its own. Telling a brand-new household that nothing
  // matches filters it never set is just confusing.
  hasFilters?: boolean;
}) {
  if (activity.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-muted-foreground md:px-6">
        {hasFilters
          ? "No activity matches these filters."
          : "Nothing recorded yet — activity shows up here as readings, payments, and completed tasks happen."}
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
