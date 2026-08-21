import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export type RepairFormDefaultValues = {
  title?: string;
  description?: string | null;
  priority?: "low" | "medium" | "high";
  status?: "open" | "in_progress" | "waiting" | "resolved";
  reportedDate?: string;
  repairedDate?: string | null;
  cost?: string | null;
  contractor?: string | null;
};

// `includeStatus` is false for the create form — a new repair always starts
// "open" (set server-side), so there's nothing to choose yet. The edit form
// shows it, since changing status over time (including to "resolved" by
// hand, not just via the quick ResolveRepairDialog) is the whole point of
// this field existing.
export function RepairFormFields({
  defaultValues,
  includeStatus = false,
}: {
  defaultValues?: RepairFormDefaultValues;
  includeStatus?: boolean;
}) {
  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="title">Title</FieldLabel>
        <Input id="title" name="title" placeholder="Leaky kitchen faucet" defaultValue={defaultValues?.title} required />
      </Field>
      <Field>
        <FieldLabel htmlFor="description">Description</FieldLabel>
        <Textarea id="description" name="description" rows={2} defaultValue={defaultValues?.description ?? ""} />
      </Field>
      <Field orientation="responsive">
        <FieldLabel htmlFor="priority">Priority</FieldLabel>
        <Select name="priority" defaultValue={defaultValues?.priority ?? "medium"}>
          <SelectTrigger id="priority" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      {includeStatus && (
        <Field orientation="responsive">
          <FieldLabel htmlFor="status">Status</FieldLabel>
          <Select name="status" defaultValue={defaultValues?.status ?? "open"}>
            <SelectTrigger id="status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="waiting">Waiting</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      )}
      <Field orientation="responsive">
        <FieldLabel htmlFor="reportedDate">Reported date</FieldLabel>
        <Input id="reportedDate" name="reportedDate" type="date" defaultValue={defaultValues?.reportedDate} required />
      </Field>
      <Field orientation="responsive">
        <FieldLabel htmlFor="repairedDate">Repaired date</FieldLabel>
        <Input id="repairedDate" name="repairedDate" type="date" defaultValue={defaultValues?.repairedDate ?? ""} />
      </Field>
      <Field orientation="responsive">
        <FieldLabel htmlFor="contractor">Contractor / provider</FieldLabel>
        <Input id="contractor" name="contractor" defaultValue={defaultValues?.contractor ?? ""} />
      </Field>
      <Field orientation="responsive">
        <FieldLabel htmlFor="cost">Cost</FieldLabel>
        <Input
          id="cost"
          name="cost"
          type="number"
          step="any"
          min="0"
          inputMode="decimal"
          defaultValue={defaultValues?.cost ?? ""}
        />
      </Field>
    </FieldGroup>
  );
}
