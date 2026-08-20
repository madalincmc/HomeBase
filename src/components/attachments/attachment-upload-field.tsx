import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

// `capture="environment"` invokes the rear camera on mobile browsers that
// support it, alongside the normal gallery/file-picker option — desktop
// browsers just ignore it and show a regular file picker.
export function AttachmentUploadField({ label = "Photo" }: { label?: string }) {
  return (
    <Field>
      <FieldLabel htmlFor="file">{label}</FieldLabel>
      <Input
        id="file"
        name="file"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
        capture="environment"
      />
      <FieldDescription>JPEG, PNG, WEBP, HEIC, or PDF, up to 10 MB.</FieldDescription>
    </Field>
  );
}
