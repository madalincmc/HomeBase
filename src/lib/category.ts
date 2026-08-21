import { Zap, Receipt, ListChecks, Wrench, type LucideIcon } from "lucide-react";

// The one household-category taxonomy shared across the dashboard (MAD-91),
// notifications (MAD-98), and activity history (MAD-99) — every feature that
// buckets things by utility/bill/chore/maintenance should use this rather
// than redefine its own icon/label mapping.
export type HouseholdCategory = "utility" | "bill" | "chore" | "maintenance";

export const CATEGORY_ICON: Record<HouseholdCategory, LucideIcon> = {
  utility: Zap,
  bill: Receipt,
  chore: ListChecks,
  maintenance: Wrench,
};

export const CATEGORY_LABEL: Record<HouseholdCategory, string> = {
  utility: "Utilities",
  bill: "Bills",
  chore: "Chores",
  maintenance: "Maintenance",
};
