import { pgEnum } from "drizzle-orm/pg-core";

export const priorityEnum = pgEnum("priority", ["low", "medium", "high"]);

export const scheduleFrequencyEnum = pgEnum("schedule_frequency", [
  "daily",
  "weekly",
  "monthly",
  "every_x_months",
  "yearly",
  "custom",
]);

export const utilityTypeEnum = pgEnum("utility_type", ["electricity", "gas", "water"]);

export const billStatusEnum = pgEnum("bill_status", ["upcoming", "due", "paid", "overdue"]);

export const occurrenceStatusEnum = pgEnum("occurrence_status", [
  "pending",
  "completed",
  "skipped",
]);

// "warranty" added in MAD-109 — a warranty expiration is a schedule-derived
// notification just like the original four, but deliberately doesn't join
// the HouseholdCategory taxonomy in src/lib/category.ts (History/Activity's
// categories) — nothing is ever "logged" when a warranty expires, so adding
// it there would create a filter option History can never have data for.
export const notificationCategoryEnum = pgEnum("notification_category", [
  "utility",
  "bill",
  "chore",
  "maintenance",
  "warranty",
  "general",
]);

export const activityTypeEnum = pgEnum("activity_type", [
  "meter_reading",
  "bill_payment",
  "chore_completed",
  "chore_skipped",
  "maintenance_completed",
]);
