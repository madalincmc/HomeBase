import { PageHeader } from "@/components/shell/page-header";
import { CreateBillDialog } from "@/components/bills/create-bill-dialog";
import { EditBillDialog } from "@/components/bills/edit-bill-dialog";
import { MarkPaidDialog } from "@/components/bills/mark-paid-dialog";
import { BillStatusBadge } from "@/components/bills/bill-status-badge";
import { CostAnalytics } from "@/components/bills/cost-analytics";
import { AttachmentList } from "@/components/attachments/attachment-list";
import { getBills, getHouseholdUtilities } from "@/lib/bills/get-bills";
import { getBillDisplayStatus } from "@/lib/bills/status";
import { getCostAnalytics } from "@/lib/bills/get-cost-analytics";
import { formatDateOnlyLabel, todayDateOnly } from "@/lib/schedule";

// Reads live household data — see the MAD-91 note in CLAUDE.md.
export const dynamic = "force-dynamic";

export default async function BillsPage() {
  const [{ unpaid, paid, scheduleById, attachmentsByBill }, utilities, costAnalytics] = await Promise.all([
    getBills(),
    getHouseholdUtilities(),
    getCostAnalytics(),
  ]);
  const today = todayDateOnly();

  return (
    <>
      <PageHeader title="Bills" description="Recurring and one-off bills, and their payment status." />
      <div className="flex justify-end p-4 md:p-6">
        <CreateBillDialog utilities={utilities} />
      </div>

      <section>
        <h2 className="px-4 pb-2 text-sm font-semibold md:px-6">Unpaid</h2>
        {unpaid.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-muted-foreground md:px-6">
            No unpaid bills — you&apos;re all caught up.
          </p>
        ) : (
          <div className="divide-y border-y">
            {unpaid.map(({ bill, utilityType }) => (
              <div key={bill.id} className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:px-6">
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="font-medium">{bill.title}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {bill.provider ?? "No provider"}
                    {utilityType && ` · ${utilityType}`}
                    {bill.category && ` · ${bill.category}`}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span>
                    {bill.amount} {bill.currency}
                  </span>
                  <span className="text-muted-foreground">{formatDateOnlyLabel(bill.dueDate)}</span>
                  <BillStatusBadge status={getBillDisplayStatus(bill, today)} />
                </div>
                <div className="flex items-center gap-2">
                  <EditBillDialog
                    bill={bill}
                    schedule={scheduleById.get(bill.scheduleId ?? "") ?? null}
                    utilities={utilities}
                    attachments={attachmentsByBill.get(bill.id) ?? []}
                  />
                  <MarkPaidDialog billId={bill.id} title={bill.title} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="px-4 py-4 md:px-6">
        <h2 className="mb-2 text-sm font-semibold">Cost analytics</h2>
        <CostAnalytics monthly={costAnalytics.monthly} yearly={costAnalytics.yearly} currency={costAnalytics.currency} />
      </section>

      <section>
        <h2 className="px-4 pt-4 pb-2 text-sm font-semibold md:px-6">Paid</h2>
        {paid.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-muted-foreground md:px-6">No payment history yet.</p>
        ) : (
          <div className="divide-y border-y">
            {paid.map(({ bill, utilityType }) => (
              <div
                key={bill.id}
                className="flex flex-col gap-3 px-4 py-3 text-muted-foreground md:flex-row md:items-center md:px-6"
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="font-medium text-foreground">{bill.title}</span>
                  <span className="truncate text-xs">
                    {bill.provider ?? "No provider"}
                    {utilityType && ` · ${utilityType}`}
                    {bill.category && ` · ${bill.category}`}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span>
                    {bill.amount} {bill.currency}
                  </span>
                  <span>Paid {bill.paidDate ? formatDateOnlyLabel(bill.paidDate) : "—"}</span>
                  <BillStatusBadge status="paid" />
                </div>
                {(attachmentsByBill.get(bill.id) ?? []).length > 0 && (
                  <div className="md:w-48">
                    <AttachmentList
                      attachments={attachmentsByBill.get(bill.id) ?? []}
                      revalidatePaths={["/bills", "/"]}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
