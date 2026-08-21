"use client";

import { useEffect, useImperativeHandle, useRef, useState, useTransition } from "react";
import { Camera, FileText, Loader2, RotateCcw, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { cn } from "@/lib/utils";

// Same accepted types as the attachments module (MAD-96) / extraction actions.
const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp,image/heic,application/pdf";

export type ScanCaptureFieldHandle = {
  reset: () => void;
};

type ScanResult<T> = { success: true; data: T } | { success: false; error: string };

// One-tap capture-and-scan field for the meter reading (MAD-104) and bill
// (MAD-103) AI extraction flows: "Take photo" opens the camera directly and
// "Upload photo" opens a normal file/gallery picker, and either way the
// moment a photo lands, scanning kicks off on its own — no separate "Scan
// with AI" button tap. The same <input name="file"> still carries the photo
// into the surrounding form's FormData for the real attachment upload
// afterward, so this is a drop-in replacement for AttachmentUploadField at
// those two call sites specifically, not a general-purpose one: everywhere
// else (documents, inventory, maintenance completion, repairs) has no
// scanning step and keeps using the plain field.
export function ScanCaptureField<T extends { confidence: "high" | "medium" | "low" }>({
  label,
  hint,
  scanAction,
  onScanned,
  resultCaption,
  name = "file",
  ref,
}: {
  label: string;
  hint: string;
  scanAction: (file: File) => Promise<ScanResult<T>>;
  // Called with the scan result on success, and with null whenever there's
  // no usable result (new file picked, cleared, or scan failed) so the
  // caller can drop any previously-applied values.
  onScanned: (data: T | null) => void;
  resultCaption: (confidence: "high" | "medium" | "low") => string;
  // Override when a form renders more than one instance (e.g. one per
  // water meter point) — every instance defaulting to "file" would
  // otherwise submit under the same FormData key.
  name?: string;
  ref?: React.Ref<ScanCaptureFieldHandle>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<"high" | "medium" | "low" | null>(null);
  const [scanning, startScanning] = useTransition();

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function reset() {
    setFile(null);
    setPreviewUrl(null);
    setScanError(null);
    setConfidence(null);
    onScanned(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  // Exposed so a form that stays mounted across submissions (the utility
  // detail page's inline AddReadingForm, which calls formRef.current.reset()
  // rather than unmounting) can clear this field's own preview/confidence
  // state too — native form.reset() only resets the underlying input's
  // value, not this component's React state built on top of it.
  useImperativeHandle(ref, () => ({ reset }));

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setScanError(null);
    setConfidence(null);
    onScanned(null);

    if (!selected) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    setFile(selected);
    setPreviewUrl(selected.type.startsWith("image/") ? URL.createObjectURL(selected) : null);

    startScanning(async () => {
      const result = await scanAction(selected);
      if (result.success) {
        setConfidence(result.data.confidence);
        onScanned(result.data);
      } else {
        setScanError(result.error);
      }
    });
  }

  // The `capture` attribute is only read by the browser at the moment the
  // picker opens, not reactively — so the same hidden input can serve both
  // entry points by toggling it immediately before each click rather than
  // needing two separate inputs (which would fight over the one "file" name
  // the form reads on submit).
  function openPicker(useCamera: boolean) {
    const input = inputRef.current;
    if (!input) return;
    if (useCamera) {
      input.setAttribute("capture", "environment");
    } else {
      input.removeAttribute("capture");
    }
    input.click();
  }

  function handleRetake() {
    reset();
    openPicker(true);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <input
        ref={inputRef}
        type="file"
        name={name}
        id={name}
        accept={ACCEPTED_TYPES}
        onChange={handleChange}
        className="sr-only"
      />
      {!file ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-input bg-muted/30 px-4 py-6 text-center">
          <div>
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">{hint}</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => openPicker(true)} className="gap-1.5">
              <Camera className="size-3.5" />
              Take photo
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => openPicker(false)} className="gap-1.5">
              <Upload className="size-3.5" />
              Upload photo
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative flex h-44 w-full items-center justify-center overflow-hidden rounded-xl border border-input bg-muted/40">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- object URL preview, not a remote asset
            <img
              src={previewUrl}
              alt=""
              className={cn("h-full w-full object-contain transition-opacity", scanning && "opacity-50")}
            />
          ) : (
            <div
              className={cn(
                "flex flex-col items-center gap-2 px-4 text-muted-foreground transition-opacity",
                scanning && "opacity-50"
              )}
            >
              <FileText className="size-8" />
              <span className="max-w-full truncate text-xs">{file.name}</span>
            </div>
          )}
          {scanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
              <Loader2 className="size-5 animate-spin" />
              <span className="text-xs font-medium">Scanning…</span>
            </div>
          )}
          <div className="absolute top-2 right-2 flex gap-1">
            <Button
              type="button"
              variant="secondary"
              size="icon-xs"
              onClick={handleRetake}
              disabled={scanning}
              aria-label="Retake photo"
              className="shadow-sm"
            >
              <RotateCcw />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon-xs"
              onClick={reset}
              disabled={scanning}
              aria-label="Remove photo"
              className="shadow-sm"
            >
              <X />
            </Button>
          </div>
        </div>
      )}
      {scanError && <FieldError>{scanError}</FieldError>}
      {confidence && !scanning && (
        <p className={cn("text-xs", confidence === "low" ? "text-destructive" : "text-muted-foreground")}>
          {resultCaption(confidence)}
        </p>
      )}
    </div>
  );
}
