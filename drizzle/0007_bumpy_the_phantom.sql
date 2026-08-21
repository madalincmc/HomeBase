CREATE TYPE "public"."repair_status" AS ENUM('open', 'in_progress', 'waiting', 'resolved');--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'repair_resolved';--> statement-breakpoint
CREATE TABLE "repairs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"priority" "priority" DEFAULT 'medium' NOT NULL,
	"status" "repair_status" DEFAULT 'open' NOT NULL,
	"reported_date" date NOT NULL,
	"repaired_date" date,
	"cost" numeric(12, 2),
	"contractor" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attachments" DROP CONSTRAINT "attachments_exactly_one_parent";--> statement-breakpoint
ALTER TABLE "attachments" ADD COLUMN "repair_id" uuid;--> statement-breakpoint
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_repair_id_repairs_id_fk" FOREIGN KEY ("repair_id") REFERENCES "public"."repairs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_exactly_one_parent" CHECK ((
        (case when "attachments"."meter_reading_id" is not null then 1 else 0 end) +
        (case when "attachments"."bill_id" is not null then 1 else 0 end) +
        (case when "attachments"."maintenance_item_id" is not null then 1 else 0 end) +
        (case when "attachments"."inventory_item_id" is not null then 1 else 0 end) +
        (case when "attachments"."repair_id" is not null then 1 else 0 end)
      ) = 1);