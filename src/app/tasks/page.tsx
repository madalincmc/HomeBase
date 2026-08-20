import { PageHeader } from "@/components/shell/page-header";

export default function TasksPage() {
  return (
    <>
      <PageHeader title="Tasks" description="Recurring household chores will show up here." />
      <div className="p-4 text-sm text-muted-foreground md:p-6">Tasks aren&apos;t built yet.</div>
    </>
  );
}
