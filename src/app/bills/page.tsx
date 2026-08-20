import { PageHeader } from "@/components/shell/page-header";

export default function BillsPage() {
  return (
    <>
      <PageHeader
        title="Bills"
        description="Recurring and one-off bills, and their payment status, will show up here."
      />
      <div className="p-4 text-sm text-muted-foreground md:p-6">Bills aren&apos;t built yet.</div>
    </>
  );
}
