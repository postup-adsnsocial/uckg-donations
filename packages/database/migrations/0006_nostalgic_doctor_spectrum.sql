CREATE TYPE "public"."donation_payment_method" AS ENUM('card', 'cash', 'check');--> statement-breakpoint
ALTER TABLE "donations" ADD COLUMN "payment_method" "donation_payment_method" DEFAULT 'cash' NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "report_files" ADD COLUMN "report_type" text DEFAULT 'detailed' NOT NULL;--> statement-breakpoint
ALTER TABLE "report_files" ADD CONSTRAINT "report_files_type_valid" CHECK ("report_files"."report_type" in ('detailed', 'member_totals', 'payment_methods'));