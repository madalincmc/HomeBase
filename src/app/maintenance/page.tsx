import { PageHeader } from "@/components/shell/page-header";

export default function MaintenancePage() {
  return (
    <>
      <PageHeader
        title="Maintenance"
        description="Recurring home and appliance maintenance will show up here."
      />
      <div className="p-4 text-sm text-muted-foreground md:p-6">
        Maintenance isn&apos;t built yet.
      </div>
    </>
  );
}
