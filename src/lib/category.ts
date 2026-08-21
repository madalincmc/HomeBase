import { Zap, Receipt, ListChecks, Wrench, Hammer, type LucideIcon } from "lucide-react";

// The one household-category taxonomy shared across the dashboard (MAD-91),
// notifications (MAD-98), and activity history (MAD-99) — every feature that
// buckets things by utility/bill/chore/maintenance should use this rather
// than redefine its own icon/label mapping. "repair" joined in MAD-110
// because resolving a repair genuinely is a logged activity (repair_resolved)
// — contrast warranty expirations (MAD-109), which deliberately stay outside
// this taxonomy since nothing is ever logged when one expires.
export type HouseholdCategory = "utility" | "bill" | "chore" | "maintenance" | "repair";

export const CATEGORY_ICON: Record<HouseholdCategory, LucideIcon> = {
  utility: Zap,
  bill: Receipt,
  chore: ListChecks,
  maintenance: Wrench,
  repair: Hammer,
};

export const CATEGORY_LABEL: Record<HouseholdCategory, string> = {
  utility: "Utilities",
  bill: "Bills",
  chore: "Chores",
  maintenance: "Maintenance",
  repair: "Repairs",
};
