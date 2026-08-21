import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { EditUtilityDialog } from "@/components/utilities/edit-utility-dialog";
import { AddReadingForm } from "@/components/utilities/add-reading-form";
import { UtilitySwitcher } from "@/components/utilities/utility-switcher";
import { ConsumptionChart } from "@/components/utilities/consumption-chart";
import { AttachmentList } from "@/components/attachments/attachment-list";
import { getUtilityDetail } from "@/lib/utilities/get-utility-detail";
import { getUtilitiesSummary } from "@/lib/utilities/get-utilities";
import { getConsumptionHistory } from "@/lib/utilities/get-consumption-history";
import { formatDateOnlyLabel } from "@/lib/schedule";

export const dynamic = "force-dynamic";

export default async function UtilityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getUtilityDetail(id);
  if (!detail) notFound();

  const { utility, schedule, readings } = detail;
  const [utilitiesSummary, consumptionHistory] = await Promise.all([
    getUtilitiesSummary(),
    getConsumptionHistory(id),
  ]);
  const title = utility.type.charAt(0).toUpperCase() + utility.type.slice(1);

  return (
    <>
      <PageHeader title={title} description={utility.provider ?? undefined} />
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <UtilitySwitcher utilities={utilitiesSummary} currentId={utility.id} />

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Account reference</dt>
            <dd>{utility.accountReference ?? "—"}</dd>
            <dt className="text-muted-foreground">Unit</dt>
            <dd>{utility.unit}</dd>
            <dt className="text-muted-foreground">Reading reminder</dt>
            <dd className="capitalize">{schedule ? schedule.frequency.replace("_", " ") : "None"}</dd>
          </dl>
          <EditUtilityDialog utility={utility} schedule={schedule} />
        </div>

        <section>
          <h2 className="mb-2 text-sm font-semibold">Consumption</h2>
          <ConsumptionChart
            history={consumptionHistory.history}
            monthly={consumptionHistory.monthly}
            unit={utility.unit}
          />
        </section>

        {/* Mobile prioritizes quick entry; desktop prioritizes history — see MAD-92 in CLAUDE.md. */}
        <section className="order-1 md:order-2">
          <h2 className="mb-2 text-sm font-semibold">Add a reading</h2>
          <AddReadingForm utilityId={utility.id} unit={utility.unit} />
        </section>

        <section className="order-2 md:order-1">
          <h2 className="mb-2 text-sm font-semibold">History</h2>
          {readings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No readings recorded yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Value</th>
                    <th className="px-3 py-2 font-medium">Consumption</th>
                    <th className="px-3 py-2 font-medium">Notes</th>
                    <th className="px-3 py-2 font-medium">Photo</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {readings.map((reading) => (
                    <tr key={reading.id}>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {formatDateOnlyLabel(reading.readingDate)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {reading.value} {utility.unit}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {reading.consumption !== null ? `${reading.consumption} ${utility.unit}` : "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{reading.notes ?? "—"}</td>
                      <td className="min-w-40 px-3 py-2">
                        <AttachmentList
                          attachments={reading.attachments}
                          revalidatePaths={[`/utilities/${utility.id}`]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
