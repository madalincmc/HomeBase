import { PageHeader } from "@/components/shell/page-header";
import { CreateBillDialog } from "@/components/bills/create-bill-dialog";
import { EditBillDialog } from "@/components/bills/edit-bill-dialog";
import { MarkPaidDialog } from "@/components/bills/mark-paid-dialog";
import { BillStatusBadge } from "@/components/bills/bill-status-badge";
import { getBills, getHouseholdUtilities } from "@/lib/bills/get-bills";
import { getBillDisplayStatus } from "@/lib/bills/status";
import { formatDateOnlyLabel, todayDateOnly } from "@/lib/schedule";

// Reads live household data — see the MAD-91 note in CLAUDE.md.
export const dynamic = "force-dynamic";

export default async function BillsPage() {
  const [{ unpaid, paid, scheduleById }, utilities] = await Promise.all([getBills(), getHouseholdUtilities()]);
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
                  <EditBillDialog bill={bill} schedule={scheduleById.get(bill.scheduleId ?? "") ?? null} utilities={utilities} />
                  <MarkPaidDialog billId={bill.id} title={bill.title} />
                </div>
              </div>
            ))}
          </div>
        )}
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
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span>
                    {bill.amount} {bill.currency}
                  </span>
                  <span>Paid {bill.paidDate ? formatDateOnlyLabel(bill.paidDate) : "—"}</span>
                  <BillStatusBadge status="paid" />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
