"use client";

import { useState } from "react";
import { Field, FieldLabel, FieldDescription, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export type BillFormUtilityOption = { id: string; type: string; provider: string | null };

export type BillFormDefaultValues = {
  title?: string;
  provider?: string | null;
  category?: string | null;
  utilityId?: string | null;
  amount?: string;
  currency?: string;
  issueDate?: string | null;
  dueDate?: string;
  scheduleFrequency?: "monthly" | "every_x_months" | "yearly" | "custom" | null;
  scheduleInterval?: number | null;
};

export function BillFormFields({
  utilities,
  defaultValues,
}: {
  utilities: BillFormUtilityOption[];
  defaultValues?: BillFormDefaultValues;
}) {
  const [frequency, setFrequency] = useState(defaultValues?.scheduleFrequency ?? "none");

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="title">Title</FieldLabel>
        <Input id="title" name="title" placeholder="August electricity" defaultValue={defaultValues?.title} required />
      </Field>
      <Field>
        <FieldLabel htmlFor="provider">Provider</FieldLabel>
        <Input id="provider" name="provider" defaultValue={defaultValues?.provider ?? ""} />
      </Field>
      <Field>
        <FieldLabel htmlFor="category">Category</FieldLabel>
        <Input
          id="category"
          name="category"
          placeholder="Utilities, Rent, Insurance…"
          defaultValue={defaultValues?.category ?? ""}
        />
        <FieldDescription>Used to group spending in cost analytics — optional.</FieldDescription>
      </Field>
      <Field orientation="responsive">
        <FieldLabel htmlFor="amount">Amount</FieldLabel>
        <Input
          id="amount"
          name="amount"
          type="number"
          step="any"
          min="0"
          inputMode="decimal"
          defaultValue={defaultValues?.amount}
          required
        />
      </Field>
      <Field orientation="responsive">
        <FieldLabel htmlFor="currency">Currency</FieldLabel>
        <Input
          id="currency"
          name="currency"
          placeholder="USD"
          defaultValue={defaultValues?.currency}
          required
        />
      </Field>
      <Field orientation="responsive">
        <FieldLabel htmlFor="issueDate">Issue date</FieldLabel>
        <Input id="issueDate" name="issueDate" type="date" defaultValue={defaultValues?.issueDate ?? ""} />
      </Field>
      <Field orientation="responsive">
        <FieldLabel htmlFor="dueDate">Due date</FieldLabel>
        <Input id="dueDate" name="dueDate" type="date" defaultValue={defaultValues?.dueDate} required />
      </Field>
      {utilities.length > 0 && (
        <Field>
          <FieldLabel htmlFor="utilityId">Utility</FieldLabel>
          <Select name="utilityId" defaultValue={defaultValues?.utilityId ?? "none"}>
            <SelectTrigger id="utilityId" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {utilities.map((utility) => (
                <SelectItem key={utility.id} value={utility.id}>
                  {utility.type.charAt(0).toUpperCase() + utility.type.slice(1)}
                  {utility.provider ? ` — ${utility.provider}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
      <Field>
        <FieldLabel htmlFor="scheduleFrequency">Recurrence</FieldLabel>
        <Select
          name="scheduleFrequency"
          defaultValue={defaultValues?.scheduleFrequency ?? "none"}
          onValueChange={setFrequency}
        >
          <SelectTrigger id="scheduleFrequency" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">One-off</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="every_x_months">Every X months</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
        {frequency !== "none" && (
          <FieldDescription>
            The next bill is created automatically when this one is marked paid, due on{" "}
            {frequency === "custom" ? "a date you set at that time" : "the computed next date"}.
          </FieldDescription>
        )}
      </Field>
      {frequency === "every_x_months" && (
        <Field>
          <FieldLabel htmlFor="scheduleInterval">Every how many months</FieldLabel>
          <Input
            id="scheduleInterval"
            name="scheduleInterval"
            type="number"
            min="2"
            step="1"
            defaultValue={defaultValues?.scheduleInterval ?? 2}
            required
          />
        </Field>
      )}
    </FieldGroup>
  );
}
