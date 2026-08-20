import { PageHeader } from "@/components/shell/page-header";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { OverviewStats } from "@/components/dashboard/overview-stats";
import { RecentActivityList } from "@/components/dashboard/recent-activity-list";
import { getDashboardData } from "@/lib/dashboard/get-dashboard-data";

// Depends on "today" and live household data — must render per-request, not
// get statically baked in at build time. Also avoids running
// getOrCreateHousehold()'s insert as a build-time side effect.
export const dynamic = "force-dynamic";

export default async function Home() {
  const { householdName, buckets, overview, recentActivity } = await getDashboardData();

  return (
    <>
      <PageHeader title="Home" description={householdName} />
      {/*
        Desktop order matches the PRD literally: Today, Needs Attention,
        Upcoming, Household Overview, Recent Activity. Mobile reorders to
        overdue-first via the `order-*` utilities below (quick actions are
        already covered by the persistent FAB from MAD-89) and hides the
        Overview/Recent Activity sections entirely, per "Mobile prioritizes
        overdue, due today, quick actions and upcoming items."
      */}
      <div className="flex flex-col gap-4 pb-4 md:gap-6 md:pb-6">
        <DashboardSection
          title="Today"
          items={buckets.dueToday}
          severity="today"
          emptyMessage="Nothing due today."
          className="order-2 md:order-1"
        />
        <DashboardSection
          title="Needs Attention"
          description="Overdue"
          items={buckets.overdue}
          severity="overdue"
          emptyMessage="Nothing overdue — you're caught up."
          className="order-1 md:order-2"
        />
        <DashboardSection
          title="Upcoming"
          description="Next 14 days"
          items={buckets.upcoming}
          severity="upcoming"
          emptyMessage="Nothing coming up in the next two weeks."
          className="order-3"
        />
        <div className="hidden md:order-4 md:block">
          <h2 className="px-6 pt-2 pb-1 text-sm font-semibold">Household Overview</h2>
          <OverviewStats overview={overview} />
        </div>
        <div className="hidden md:order-5 md:block">
          <RecentActivityList activity={recentActivity} />
        </div>
      </div>
    </>
  );
}
