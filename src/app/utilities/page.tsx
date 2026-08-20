import { PageHeader } from "@/components/shell/page-header";

export default function UtilitiesPage() {
  return (
    <>
      <PageHeader
        title="Utilities"
        description="Electricity, gas, and water meter readings will show up here."
      />
      <div className="p-4 text-sm text-muted-foreground md:p-6">
        Utilities aren&apos;t built yet.
      </div>
    </>
  );
}
