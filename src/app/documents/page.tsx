import { PageHeader } from "@/components/shell/page-header";
import { CreateDocumentDialog } from "@/components/documents/create-document-dialog";
import { DocumentFilters } from "@/components/documents/document-filters";
import { DocumentList } from "@/components/documents/document-list";
import { getDocuments, getDocumentCategories, getLinkableEntities } from "@/lib/documents/get-documents";
import { getHouseholdRooms } from "@/lib/rooms/get-rooms";

// Reads live household data — see the MAD-91 note in CLAUDE.md.
export const dynamic = "force-dynamic";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; room?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() || undefined;
  const category = params.category && params.category !== "all" ? params.category : undefined;
  const roomId = params.room && params.room !== "all" ? params.room : undefined;

  const [documents, categories, rooms, linkable] = await Promise.all([
    getDocuments({ q, category, roomId }),
    getDocumentCategories(),
    getHouseholdRooms(),
    getLinkableEntities(),
  ]);

  return (
    <>
      <PageHeader
        title="Documents"
        description="Receipts, warranties, manuals, contracts, and service records."
      />
      <div className="flex justify-end p-4 md:p-6">
        <CreateDocumentDialog rooms={rooms} linkable={linkable} />
      </div>
      <DocumentFilters
        q={q ?? ""}
        category={category ?? "all"}
        roomId={roomId ?? "all"}
        categories={categories}
        rooms={rooms}
      />
      <DocumentList documents={documents} hasFilters={Boolean(q || category || roomId)} />
    </>
  );
}
