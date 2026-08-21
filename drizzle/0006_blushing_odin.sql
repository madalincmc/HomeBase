ALTER TYPE "public"."notification_category" ADD VALUE 'warranty' BEFORE 'general';--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "warranty_start_date" date;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "warranty_expiration_date" date;