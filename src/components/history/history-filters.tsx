"use client";

import Form from "next/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORY_LABEL, type HouseholdCategory } from "@/lib/category";

const CATEGORY_OPTIONS: { value: HouseholdCategory | "all"; label: string }[] = [
  { value: "all", label: "All categories" },
  ...(Object.entries(CATEGORY_LABEL) as [HouseholdCategory, string][]).map(([value, label]) => ({
    value,
    label,
  })),
];

export function HistoryFilters({
  category,
  from,
  to,
}: {
  category: string;
  from: string;
  to: string;
}) {
  const hasFilters = category !== "all" || from !== "" || to !== "";

  return (
    // next/form does a GET client-side navigation, encoding fields into the
    // URL as search params — the history page reads them back via its own
    // searchParams prop. No client state needed here at all.
    <Form action="/history" className="flex flex-wrap items-end gap-3 border-b px-4 py-4 md:px-6">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="category">Category</Label>
        <Select name="category" defaultValue={category}>
          <SelectTrigger id="category" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="from">From</Label>
        <Input id="from" name="from" type="date" defaultValue={from} className="w-auto" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="to">To</Label>
        <Input id="to" name="to" type="date" defaultValue={to} className="w-auto" />
      </div>
      <Button type="submit">Filter</Button>
      {hasFilters && (
        <Button variant="ghost" asChild>
          <a href="/history">Reset</a>
        </Button>
      )}
    </Form>
  );
}
