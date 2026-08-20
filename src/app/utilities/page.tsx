import Link from "next/link";
import { Zap, Flame, Droplet } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { CreateUtilityDialog } from "@/components/utilities/create-utility-dialog";
import { getUtilitiesWithLatestReadings } from "@/lib/utilities/get-utilities";
import { formatDateOnlyLabel } from "@/lib/schedule";

// Reads live household data — see the MAD-91 note in CLAUDE.md on why this
// can't be statically prerendered.
export const dynamic = "force-dynamic";

const ICON_BY_TYPE = { electricity: Zap, gas: Flame, water: Droplet } as const;

export default async function UtilitiesPage() {
  const utilitiesList = await getUtilitiesWithLatestReadings();

  return (
    <>
      <PageHeader
        title="Utilities"
        description="Electricity, gas, and water meter readings."
      />
      <div className="flex justify-end p-4 md:p-6">
        <CreateUtilityDialog />
      </div>
      {utilitiesList.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted-foreground md:px-6">
          No utilities yet — add one to start tracking meter readings.
        </p>
      ) : (
        <div className="divide-y border-y">
          {utilitiesList.map((utility) => {
            const Icon = ICON_BY_TYPE[utility.type];
            return (
              <Link
                key={utility.id}
                href={`/utilities/${utility.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted md:px-6"
              >
                <Icon className="size-5 shrink-0 text-muted-foreground" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="font-medium capitalize">{utility.type}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {utility.provider ?? "No provider set"}
                  </span>
                </div>
                <div className="shrink-0 text-right text-sm">
                  {utility.latestReading ? (
                    <>
                      <div>
                        {utility.latestReading.value} {utility.unit}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateOnlyLabel(utility.latestReading.readingDate)}
                        {utility.consumption !== null && ` · +${utility.consumption} ${utility.unit}`}
                      </div>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">No readings yet</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
