import { PageHeader } from "@/components/shell/page-header";

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Household name, default rooms, and notification preferences will show up here."
      />
      <div className="p-4 text-sm text-muted-foreground md:p-6">
        Settings aren&apos;t built yet.
      </div>
    </>
  );
}
