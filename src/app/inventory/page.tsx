import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { CreateInventoryItemDialog } from "@/components/inventory/create-inventory-item-dialog";
import { EditInventoryItemDialog } from "@/components/inventory/edit-inventory-item-dialog";
import { DeleteInventoryItemDialog } from "@/components/inventory/delete-inventory-item-dialog";
import { InventoryFilters } from "@/components/inventory/inventory-filters";
import { WarrantyBadge } from "@/components/inventory/warranty-badge";
import { AttachmentList } from "@/components/attachments/attachment-list";
import { getInventoryItems, getInventoryCategories } from "@/lib/inventory/get-inventory";
import { getHouseholdRooms } from "@/lib/rooms/get-rooms";
import { formatDateOnlyLabel, todayDateOnly } from "@/lib/schedule";

// Reads live household data — see the MAD-91 note in CLAUDE.md.
export const dynamic = "force-dynamic";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; room?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() || undefined;
  const category = params.category && params.category !== "all" ? params.category : undefined;
  const roomId = params.room && params.room !== "all" ? params.room : undefined;

  const [{ items, attachmentsByItem }, categories, rooms] = await Promise.all([
    getInventoryItems({ q, category, roomId }),
    getInventoryCategories(),
    getHouseholdRooms(),
  ]);
  const today = todayDateOnly();

  return (
    <>
      <PageHeader title="Inventory" description="Appliances, electronics, and other household assets." />
      <div className="flex justify-end p-4 md:p-6">
        <CreateInventoryItemDialog rooms={rooms} />
      </div>
      <InventoryFilters
        q={q ?? ""}
        category={category ?? "all"}
        roomId={roomId ?? "all"}
        categories={categories}
        rooms={rooms}
      />

      {items.length === 0 ? (
        <p className="px-4 py-4 text-sm text-muted-foreground md:px-6">
          No inventory items match — try a different search or filter.
        </p>
      ) : (
        <div className="divide-y border-y">
          {items.map(({ item, roomName }) => (
            <div key={item.id} className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:px-6">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{item.name}</span>
                  {item.category && <Badge variant="secondary">{item.category}</Badge>}
                  <WarrantyBadge expirationDate={item.warrantyExpirationDate} today={today} />
                </div>
                <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                  {roomName && <span>{roomName}</span>}
                  {item.brand && <span>{item.brand}</span>}
                  {item.model && <span>{item.model}</span>}
                  {item.serialNumber && <span>S/N {item.serialNumber}</span>}
                  {item.purchaseDate && <span>Purchased {formatDateOnlyLabel(item.purchaseDate)}</span>}
                  {item.price && <span>{item.price}</span>}
                </div>
                {(attachmentsByItem.get(item.id) ?? []).length > 0 && (
                  <div className="md:w-64">
                    <AttachmentList attachments={attachmentsByItem.get(item.id) ?? []} revalidatePaths={["/inventory"]} />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <EditInventoryItemDialog item={item} rooms={rooms} attachments={attachmentsByItem.get(item.id) ?? []} />
                <DeleteInventoryItemDialog itemId={item.id} name={item.name} />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
