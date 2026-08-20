import { todayDateOnly, type DateOnly } from "@/lib/schedule";

export type BillDisplayStatus = "paid" | "overdue" | "dueToday" | "upcoming";

// bills.status is only ever written as "upcoming" (creation) or "paid" (mark
// paid) — see actions.ts. The "due"/"overdue" enum values exist in the
// schema but nothing ever writes them, because they're time-derived and
// would go stale the moment a day passes with no write. Same reasoning as
// the dashboard (MAD-91): compute the display status from dueDate instead
// of trusting a stored value for the non-paid states.
export function getBillDisplayStatus(
  bill: { status: string; dueDate: DateOnly },
  today: DateOnly = todayDateOnly()
): BillDisplayStatus {
  if (bill.status === "paid") return "paid";
  if (bill.dueDate < today) return "overdue";
  if (bill.dueDate === today) return "dueToday";
  return "upcoming";
}
