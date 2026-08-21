"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Rectangle, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
// Straight from the module, not the @/lib/schedule barrel — that barrel also
// re-exports task-occurrences.ts, which pulls in the `pg` driver via
// src/db. This is a Client Component, so going through the barrel would
// bundle `pg` for the browser and fail the build. See the MAD-98 note in
// CLAUDE.md.
import { formatDateOnlyLabel } from "@/lib/schedule/format";
import type { ConsumptionEntry, MonthlyConsumption } from "@/lib/utilities/get-consumption-history";

const chartConfig = {
  consumption: { label: "Consumption" },
} satisfies ChartConfig;

const MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });

function formatMonthLabel(month: string): string {
  return MONTH_FORMATTER.format(new Date(`${month}-01T00:00:00Z`));
}

// Bars for gapped periods render in a washed-out tone instead of the normal
// chart color — "missing readings handled clearly" (MAD-105) means visible
// in the chart itself, not just a caveat in the surrounding text.
function GapAwareBar(props: React.ComponentProps<typeof Rectangle> & { payload?: { gap?: boolean } }) {
  const { payload, ...rest } = props;
  // chart-3 (solid) vs chart-1 (washed out) — the Nova theme's chart
  // palette runs light-to-dark, so the *lightest* tone reads as "faded/
  // de-emphasized" for a gap, not the darkest.
  return <Rectangle {...rest} fill={payload?.gap ? "var(--color-chart-1)" : "var(--color-chart-3)"} />;
}

export function ConsumptionChart({
  history,
  monthly,
  unit,
}: {
  history: ConsumptionEntry[];
  monthly: MonthlyConsumption[];
  unit: string;
}) {
  const [view, setView] = useState<"monthly" | "history">("monthly");

  const monthlyData = monthly.map((m) => ({
    label: formatMonthLabel(m.month),
    consumption: m.totalConsumption,
    gap: m.hasGap,
  }));
  const historyData = history
    .filter((entry) => entry.consumption !== null || entry.gap)
    .map((entry) => ({
      label: formatDateOnlyLabel(entry.date),
      consumption: entry.consumption,
      gap: entry.gap,
    }));
  const data = view === "monthly" ? monthlyData : historyData;
  const hasAnyGap = data.some((d) => d.gap);

  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Not enough readings yet to show consumption — add a second reading to see the first data
        point.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Button variant={view === "monthly" ? "secondary" : "outline"} size="sm" onClick={() => setView("monthly")}>
          Monthly
        </Button>
        <Button variant={view === "history" ? "secondary" : "outline"} size="sm" onClick={() => setView("history")}>
          History
        </Button>
      </div>
      <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
        <BarChart data={data} margin={{ left: 4, right: 4 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={48}
            tickFormatter={(value: number) => value.toLocaleString()}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, _name, item) => (
                  <span>
                    {value == null ? "No data" : `${Number(value).toLocaleString()} ${unit}`}
                    {item?.payload?.gap ? " (gap in readings)" : ""}
                  </span>
                )}
              />
            }
          />
          <Bar dataKey="consumption" shape={GapAwareBar} radius={4} isAnimationActive={false} />
        </BarChart>
      </ChartContainer>
      {hasAnyGap && (
        <p className="text-xs text-muted-foreground">
          Bars in a lighter shade cover a period with a gap of more than 45 days since the previous
          reading — consumption for that period may be incomplete.
        </p>
      )}
    </div>
  );
}
