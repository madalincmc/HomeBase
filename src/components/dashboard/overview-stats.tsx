import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { DashboardData } from "@/lib/dashboard/get-dashboard-data";

export function OverviewStats({ overview }: { overview: DashboardData["overview"] }) {
  const stats = [
    { label: "Utilities", value: overview.utilities },
    { label: "Chores", value: overview.chores },
    { label: "Maintenance items", value: overview.maintenanceItems },
    { label: "Unpaid bills", value: overview.unpaidBills },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4 md:p-6">
      {stats.map((stat) => (
        <Card key={stat.label} size="sm">
          <CardHeader>
            <CardTitle className="text-2xl">{stat.value}</CardTitle>
            <CardDescription>{stat.label}</CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
