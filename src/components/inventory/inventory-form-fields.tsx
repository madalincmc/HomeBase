import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export type InventoryFormRoomOption = { id: string; name: string };

export type InventoryFormDefaultValues = {
  name?: string;
  category?: string | null;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  purchaseDate?: string | null;
  price?: string | null;
  roomId?: string | null;
};

export function InventoryFormFields({
  rooms,
  defaultValues,
}: {
  rooms: InventoryFormRoomOption[];
  defaultValues?: InventoryFormDefaultValues;
}) {
  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="name">Name</FieldLabel>
        <Input id="name" name="name" placeholder="Kitchen refrigerator" defaultValue={defaultValues?.name} required />
      </Field>
      <Field orientation="responsive">
        <FieldLabel htmlFor="category">Category</FieldLabel>
        <Input
          id="category"
          name="category"
          placeholder="Appliance, Electronics…"
          defaultValue={defaultValues?.category ?? ""}
        />
      </Field>
      {rooms.length > 0 && (
        <Field>
          <FieldLabel htmlFor="roomId">Area</FieldLabel>
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
        <FieldLabel htmlFor="brand">Brand</FieldLabel>
        <Input id="brand" name="brand" defaultValue={defaultValues?.brand ?? ""} />
      </Field>
      <Field orientation="responsive">
        <FieldLabel htmlFor="model">Model</FieldLabel>
        <Input id="model" name="model" defaultValue={defaultValues?.model ?? ""} />
      </Field>
      <Field>
        <FieldLabel htmlFor="serialNumber">Serial number</FieldLabel>
        <Input id="serialNumber" name="serialNumber" defaultValue={defaultValues?.serialNumber ?? ""} />
      </Field>
      <Field orientation="responsive">
        <FieldLabel htmlFor="purchaseDate">Purchase date</FieldLabel>
        <Input id="purchaseDate" name="purchaseDate" type="date" defaultValue={defaultValues?.purchaseDate ?? ""} />
      </Field>
      <Field orientation="responsive">
        <FieldLabel htmlFor="price">Price</FieldLabel>
        <Input
          id="price"
          name="price"
          type="number"
          step="any"
          min="0"
          inputMode="decimal"
          defaultValue={defaultValues?.price ?? ""}
        />
      </Field>
    </FieldGroup>
  );
}
