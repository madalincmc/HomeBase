"use client";

import { useState } from "react";
import { Field, FieldLabel, FieldDescription, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export type MaintenanceFormRoomOption = { id: string; name: string };

export type MaintenanceFormDefaultValues = {
  title?: string;
  description?: string | null;
  category?: string | null;
  roomId?: string | null;
  relatedAppliance?: string | null;
  priority?: "low" | "medium" | "high";
  estimatedCost?: string | null;
  dueDate?: string;
  scheduleFrequency?: "daily" | "weekly" | "monthly" | "every_x_months" | "yearly" | "custom" | null;
  scheduleInterval?: number | null;
};

export function MaintenanceFormFields({
  rooms,
  defaultValues,
}: {
  rooms: MaintenanceFormRoomOption[];
  defaultValues?: MaintenanceFormDefaultValues;
}) {
  const [frequency, setFrequency] = useState(defaultValues?.scheduleFrequency ?? "none");

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="title">Title</FieldLabel>
        <Input
          id="title"
          name="title"
          placeholder="Replace HVAC filter"
          defaultValue={defaultValues?.title}
          required
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="description">Description</FieldLabel>
        <Textarea id="description" name="description" rows={2} defaultValue={defaultValues?.description ?? ""} />
      </Field>
      <Field orientation="responsive">
        <FieldLabel htmlFor="category">Category</FieldLabel>
        <Input id="category" name="category" placeholder="HVAC" defaultValue={defaultValues?.category ?? ""} />
      </Field>
      <Field orientation="responsive">
        <FieldLabel htmlFor="relatedAppliance">Related appliance</FieldLabel>
        <Input
          id="relatedAppliance"
          name="relatedAppliance"
          defaultValue={defaultValues?.relatedAppliance ?? ""}
        />
      </Field>
      {rooms.length > 0 && (
        <Field>
          <FieldLabel htmlFor="roomId">Room</FieldLabel>
          <Select name="roomId" defaultValue={defaultValues?.roomId ?? "none"}>
            <SelectTrigger id="roomId" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {rooms.map((room) => (
                <SelectItem key={room.id} value={room.id}>
                  {room.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
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
      <Field orientation="responsive">
        <FieldLabel htmlFor="estimatedCost">Estimated cost</FieldLabel>
        <Input
          id="estimatedCost"
          name="estimatedCost"
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          defaultValue={defaultValues?.estimatedCost ?? ""}
        />
      </Field>
      <Field orientation="responsive">
        <FieldLabel htmlFor="dueDate">Due date</FieldLabel>
        <Input id="dueDate" name="dueDate" type="date" defaultValue={defaultValues?.dueDate} required />
      </Field>
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
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="every_x_months">Every X months</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
        {frequency !== "none" && (
          <FieldDescription>
            The next occurrence is created automatically when this one is completed or skipped.
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
