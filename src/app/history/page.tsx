import { PageHeader } from "@/components/shell/page-header";

export default function HistoryPage() {
  return (
    <>
      <PageHeader
        title="History"
        description="A chronological timeline of household activity will show up here."
      />
      <div className="p-4 text-sm text-muted-foreground md:p-6">
        History isn&apos;t built yet.
      </div>
    </>
  );
}
