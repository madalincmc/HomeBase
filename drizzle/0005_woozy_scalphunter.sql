CREATE TABLE "inventory_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"room_id" uuid,
	"name" text NOT NULL,
	"category" text,
	"brand" text,
	"model" text,
	"serial_number" text,
	"purchase_date" date,
	"price" numeric(12, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attachments" DROP CONSTRAINT "attachments_exactly_one_parent";--> statement-breakpoint
ALTER TABLE "attachments" ADD COLUMN "inventory_item_id" uuid;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_exactly_one_parent" CHECK ((
        (case when "attachments"."meter_reading_id" is not null then 1 else 0 end) +
        (case when "attachments"."bill_id" is not null then 1 else 0 end) +
        (case when "attachments"."maintenance_item_id" is not null then 1 else 0 end) +
        (case when "attachments"."inventory_item_id" is not null then 1 else 0 end)
      ) = 1);