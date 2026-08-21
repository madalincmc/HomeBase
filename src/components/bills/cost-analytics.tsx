"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import type { PeriodCost } from "@/lib/bills/get-cost-analytics";

// The palette cycles through the Nova theme's 5 grayscale chart tokens —
// same tokens MAD-105's consumption chart uses. A household's bill
// categories are a handful of free-text labels at most, so 5 distinct tones
// (repeating past that) is plenty; no need for a larger generated palette.
const CATEGORY_COLORS = [
  "var(--color-chart-3)",
  "var(--color-chart-1)",
  "var(--color-chart-5)",
  "var(--color-chart-2)",
  "var(--color-chart-4)",
];

const chartConfig = {
  total: { label: "Total" },
} satisfies ChartConfig;

function formatAmount(total: number, currency: string | null): string {
  return `${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${currency ? ` ${currency}` : ""}`;
}

export function CostAnalytics({
  monthly,
  yearly,
  currency,
}: {
  monthly: PeriodCost[];
  yearly: PeriodCost[];
  currency: string | null;
}) {
  const [view, setView] = useState<"monthly" | "yearly">("monthly");
  const data = view === "monthly" ? monthly : yearly;

  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No payment history yet — mark a bill as paid to see spending trends here.
      </p>
    );
  }

  const latest = data[data.length - 1];
  const chartData = data.map((period) => ({ label: period.label, total: period.total }));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Button variant={view === "monthly" ? "secondary" : "outline"} size="sm" onClick={() => setView("monthly")}>
          Monthly
        </Button>
        <Button variant={view === "yearly" ? "secondary" : "outline"} size="sm" onClick={() => setView("yearly")}>
          Yearly
        </Button>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold">{formatAmount(latest.total, currency)}</span>
        <span className="text-sm text-muted-foreground">{latest.label}</span>
        {latest.changePercent !== null && (
          <span
            className={cn(
              "flex items-center gap-1 text-xs font-medium",
              latest.changePercent > 0 ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {latest.changePercent > 0 ? (
              <TrendingUp className="size-3.5" />
            ) : latest.changePercent < 0 ? (
              <TrendingDown className="size-3.5" />
            ) : (
              <Minus className="size-3.5" />
            )}
            {Math.abs(latest.changePercent)}% vs previous {view === "monthly" ? "month" : "year"}
          </span>
        )}
      </div>

      <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full">
        <BarChart data={chartData} margin={{ left: 4, right: 4 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} tickMargin={8} width={48} tickFormatter={(v: number) => v.toLocaleString()} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) => <span>{formatAmount(Number(value), currency)}</span>}
              />
            }
          />
          <Bar dataKey="total" fill="var(--color-chart-3)" radius={4} />
        </BarChart>
      </ChartContainer>

      <div className="flex flex-col gap-1.5">
        <h3 className="text-xs font-medium text-muted-foreground">Breakdown for {latest.label}</h3>
        {latest.categories.map((entry, index) => {
          const percent = latest.total > 0 ? (entry.total / latest.total) * 100 : 0;
          return (
            <div key={entry.category} className="flex items-center gap-2 text-sm">
              <span className="w-28 shrink-0 truncate">{entry.category}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${percent}%`, backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                />
              </div>
              <span className="w-24 shrink-0 text-right text-muted-foreground">
                {formatAmount(entry.total, currency)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
