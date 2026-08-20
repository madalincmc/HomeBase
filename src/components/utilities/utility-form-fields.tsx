"use client";

import { useState } from "react";
import { Field, FieldLabel, FieldDescription, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export type UtilityFormDefaultValues = {
  type?: "electricity" | "gas" | "water";
  provider?: string | null;
  accountReference?: string | null;
  unit?: string;
  scheduleFrequency?: "monthly" | "custom" | null;
  scheduleAnchorDate?: string | null;
};

export function UtilityFormFields({ defaultValues }: { defaultValues?: UtilityFormDefaultValues }) {
  const [frequency, setFrequency] = useState(defaultValues?.scheduleFrequency ?? "none");

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="type">Type</FieldLabel>
        <Select name="type" defaultValue={defaultValues?.type ?? "electricity"}>
          <SelectTrigger id="type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="electricity">Electricity</SelectItem>
            <SelectItem value="gas">Gas</SelectItem>
            <SelectItem value="water">Water</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel htmlFor="unit">Unit</FieldLabel>
        <Input id="unit" name="unit" placeholder="kWh, m3, gal…" defaultValue={defaultValues?.unit} required />
      </Field>
      <Field>
        <FieldLabel htmlFor="provider">Provider</FieldLabel>
        <Input id="provider" name="provider" defaultValue={defaultValues?.provider ?? ""} />
      </Field>
      <Field>
        <FieldLabel htmlFor="accountReference">Account reference</FieldLabel>
        <Input
          id="accountReference"
          name="accountReference"
          defaultValue={defaultValues?.accountReference ?? ""}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="scheduleFrequency">Reading reminder</FieldLabel>
        <Select
          name="scheduleFrequency"
          defaultValue={defaultValues?.scheduleFrequency ?? "none"}
          onValueChange={setFrequency}
        >
          <SelectTrigger id="scheduleFrequency" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      {frequency !== "none" && (
        <Field>
          <FieldLabel htmlFor="scheduleAnchorDate">Reminder start date</FieldLabel>
          <Input
            id="scheduleAnchorDate"
            name="scheduleAnchorDate"
            type="date"
            defaultValue={defaultValues?.scheduleAnchorDate ?? ""}
            required
          />
          {frequency === "custom" && (
            <FieldDescription>
              Custom reminders don&apos;t auto-repeat — you&apos;ll set the next date by hand each
              time.
            </FieldDescription>
          )}
        </Field>
      )}
    </FieldGroup>
  );
}
