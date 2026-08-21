import { put, del } from "@vercel/blob";

// Shared with the document vault (MAD-107) — the actual Vercel Blob calls
// and validation rules live in exactly one place regardless of which
// feature is uploading a file.
export const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export function validateFile(file: File): void {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    throw new Error("Only JPEG, PNG, WEBP, HEIC images or PDF documents are supported.");
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("File must be 10 MB or smaller.");
  }
}

export async function uploadFile(
  file: File,
  folder: string
): Promise<{ url: string; filename: string; contentType: string; sizeBytes: number }> {
  validateFile(file);
  const blob = await put(`${folder}/${crypto.randomUUID()}-${file.name}`, file, { access: "public" });
  return { url: blob.url, filename: file.name, contentType: file.type, sizeBytes: file.size };
}

export async function deleteFile(url: string): Promise<void> {
  await del(url);
}
