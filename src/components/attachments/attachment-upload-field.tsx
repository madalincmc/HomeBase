import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

// `capture="environment"` invokes the rear camera on mobile browsers that
// support it, alongside the normal gallery/file-picker option — desktop
// browsers just ignore it and show a regular file picker.
export function AttachmentUploadField({
  label = "Photo",
  inputRef,
  required = false,
}: {
  label?: string;
  // Optional: lets a parent (e.g. the bill dialog's "Scan with AI" button,
  // MAD-103) read the currently-selected file on demand without a second,
  // duplicate file picker.
  inputRef?: React.Ref<HTMLInputElement>;
  // The document vault (MAD-107) is the first caller where a file is the
  // whole point rather than an optional add-on — everywhere else this stays
  // false, unchanged from before this prop existed.
  required?: boolean;
}) {
  return (
    <Field>
      <FieldLabel htmlFor="file">{label}</FieldLabel>
      <Input
        ref={inputRef}
        id="file"
        name="file"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
        capture="environment"
        required={required}
      />
      <FieldDescription>JPEG, PNG, WEBP, HEIC, or PDF, up to 10 MB.</FieldDescription>
    </Field>
  );
}
