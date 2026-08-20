"use client";

import { useTransition } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteAttachment } from "@/lib/attachments/actions";

type AttachmentSummary = {
  id: string;
  url: string;
  filename: string | null;
  contentType: string | null;
};

export function AttachmentList({
  attachments,
  revalidatePaths,
}: {
  attachments: AttachmentSummary[];
  revalidatePaths: string[];
}) {
  if (attachments.length === 0) return null;

  return (
    <ul className="flex flex-col gap-2">
      {attachments.map((attachment) => (
        <AttachmentRow key={attachment.id} attachment={attachment} revalidatePaths={revalidatePaths} />
      ))}
    </ul>
  );
}

function AttachmentRow({
  attachment,
  revalidatePaths,
}: {
  attachment: AttachmentSummary;
  revalidatePaths: string[];
}) {
  const [pending, startTransition] = useTransition();
  const isImage = attachment.contentType?.startsWith("image/") ?? false;

  function handleDelete() {
    startTransition(async () => {
      await deleteAttachment(attachment.id, revalidatePaths);
    });
  }

  return (
    <li className="flex items-center gap-2 text-sm">
      {isImage ? (
        <a href={attachment.url} target="_blank" rel="noreferrer" className="shrink-0">
          {/* Plain <img>, not next/image — these are unpredictable-dimension
              thumbnails from an external Blob URL; not worth configuring
              remotePatterns for. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={attachment.url}
            alt={attachment.filename ?? "Attachment"}
            className="size-10 rounded object-cover"
          />
        </a>
      ) : (
        <FileText className="size-5 shrink-0 text-muted-foreground" />
      )}
      <a
        href={attachment.url}
        target="_blank"
        rel="noreferrer"
        className="flex-1 truncate underline-offset-4 hover:underline"
      >
        {attachment.filename ?? "Attachment"}
      </a>
      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={handleDelete}>
        Remove
      </Button>
    </li>
  );
}
