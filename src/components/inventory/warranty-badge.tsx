import { Badge } from "@/components/ui/badge";
import { formatDateOnlyLabel } from "@/lib/schedule/format";
import type { DateOnly } from "@/lib/schedule/compute-next-occurrence";
import { getWarrantyStatus } from "@/lib/inventory/warranty-status";

const LABEL_PREFIX = {
  active: "Warranty until",
  expiring_soon: "Warranty until",
  expired: "Warranty expired",
} as const;

const VARIANT = {
  active: "outline",
  expiring_soon: "secondary",
  expired: "destructive",
} as const;

export function WarrantyBadge({ expirationDate, today }: { expirationDate: DateOnly | null; today: DateOnly }) {
  const status = getWarrantyStatus(expirationDate, today);
  if (!status) return null;

  return (
    <Badge variant={VARIANT[status]}>
      {LABEL_PREFIX[status]} {formatDateOnlyLabel(expirationDate!)}
    </Badge>
  );
}
