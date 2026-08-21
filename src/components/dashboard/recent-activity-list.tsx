import Link from "next/link";
import { formatActivityTimestamp } from "@/lib/activities/format";
import type { DashboardData } from "@/lib/dashboard/get-dashboard-data";

export function RecentActivityList({ activity }: { activity: DashboardData["recentActivity"] }) {
  return (
    <section>
      <div className="flex items-center justify-between px-4 pt-4 pb-2 md:px-6">
        <h2 className="text-sm font-semibold">Recent Activity</h2>
        <Link href="/history" className="text-xs text-muted-foreground hover:text-foreground">
          View all
        </Link>
      </div>
      {activity.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted-foreground md:px-6">
          Nothing recorded yet — activity shows up here as readings, payments, and completed
          tasks happen.
        </p>
      ) : (
        <ul className="divide-y border-y">
          {activity.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm md:px-6">
              <span>{entry.description}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatActivityTimestamp(entry.occurredAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
