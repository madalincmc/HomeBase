CREATE TABLE "meter_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"utility_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meter_readings" ADD COLUMN "meter_point_id" uuid;--> statement-breakpoint
ALTER TABLE "meter_points" ADD CONSTRAINT "meter_points_utility_id_utilities_id_fk" FOREIGN KEY ("utility_id") REFERENCES "public"."utilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meter_readings" ADD CONSTRAINT "meter_readings_meter_point_id_meter_points_id_fk" FOREIGN KEY ("meter_point_id") REFERENCES "public"."meter_points"("id") ON DELETE set null ON UPDATE no action;