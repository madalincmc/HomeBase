"use client";

import { useTransition } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { deleteDocument } from "@/lib/documents/actions";
import { formatActivityTimestamp } from "@/lib/activities/format";
import type { DocumentRow } from "@/lib/documents/get-documents";

export function DocumentList({ documents }: { documents: DocumentRow[] }) {
  if (documents.length === 0) {
    return <p className="px-4 py-4 text-sm text-muted-foreground md:px-6">No documents match — try a different search or filter.</p>;
  }

  return (
    <div className="divide-y border-y">
      {documents.map((document) => (
        <DocumentRowItem key={document.id} document={document} />
      ))}
    </div>
  );
}

function DocumentRowItem({ document }: { document: DocumentRow }) {
  const [pending, startTransition] = useTransition();
  const isImage = document.contentType?.startsWith("image/") ?? false;

  function handleDelete() {
    startTransition(async () => {
      await deleteDocument(document.id);
    });
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 md:px-6">
      <a href={document.url} target="_blank" rel="noreferrer" className="shrink-0">
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={document.url} alt={document.filename ?? document.title} className="size-10 rounded object-cover" />
        ) : (
          <FileText className="size-10 rounded bg-muted p-2 text-muted-foreground" />
        )}
      </a>
      <div className="flex min-w-0 flex-1 flex-col">
        <a href={document.url} target="_blank" rel="noreferrer" className="truncate font-medium underline-offset-4 hover:underline">
          {document.title}
        </a>
        <span className="truncate text-xs text-muted-foreground">
          {formatActivityTimestamp(document.createdAt)}
          {document.roomName && ` · ${document.roomName}`}
          {document.linkedTitle && ` · Linked to ${document.linkedTitle}`}
        </span>
      </div>
      {document.category && <Badge variant="secondary">{document.category}</Badge>}
      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={handleDelete}>
        Remove
      </Button>
    </div>
  );
}
