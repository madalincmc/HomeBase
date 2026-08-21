import { PageHeader } from "@/components/shell/page-header";
import { HistoryFilters } from "@/components/history/history-filters";
import { ActivityList } from "@/components/history/activity-list";
import { getActivityHistory } from "@/lib/activities/get-activity-history";
import { isValidDateOnly } from "@/lib/schedule";
import type { HouseholdCategory } from "@/lib/category";

// Reads live household data — see the MAD-91 note in CLAUDE.md.
export const dynamic = "force-dynamic";

const CATEGORIES: HouseholdCategory[] = ["utility", "bill", "chore", "maintenance", "repair"];

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  // Query params are user-editable/bookmarkable, unlike form POST bodies —
  // validate here rather than trusting them, same reasoning as
  // isValidDateOnly's other call sites.
  const category = CATEGORIES.find((c) => c === params.category);
  const from = params.from && isValidDateOnly(params.from) ? params.from : undefined;
  const to = params.to && isValidDateOnly(params.to) ? params.to : undefined;

  const activity = await getActivityHistory({ category, from, to });

  return (
    <>
      <PageHeader title="History" description="A chronological timeline of household activity." />
      <HistoryFilters category={category ?? "all"} from={from ?? ""} to={to ?? ""} />
      <ActivityList activity={activity} />
    </>
  );
}
