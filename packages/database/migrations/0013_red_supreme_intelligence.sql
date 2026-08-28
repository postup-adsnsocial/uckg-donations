CREATE TYPE "public"."annual_book_service_slot" AS ENUM('first', 'second', 'third', 'fourth', 'extra');--> statement-breakpoint
CREATE TABLE "annual_book_amounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" uuid NOT NULL,
	"annual_book_day_id" uuid NOT NULL,
	"service_slot" "annual_book_service_slot" NOT NULL,
	"payment_method" "donation_payment_method" NOT NULL,
	"amount_cents" integer NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "annual_book_amounts_positive" CHECK ("annual_book_amounts"."amount_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "annual_book_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" uuid NOT NULL,
	"entry_date" date NOT NULL,
	"designated_envelope_cents" integer DEFAULT 0 NOT NULL,
	"ath_mobile_cents" integer DEFAULT 0 NOT NULL,
	"card_machine_cents" integer,
	"notes" text,
	"created_by" uuid NOT NULL,
	"updated_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "annual_book_days_church_id_id_unique" UNIQUE("church_id","id"),
	CONSTRAINT "annual_book_days_designated_nonnegative" CHECK ("annual_book_days"."designated_envelope_cents" >= 0),
	CONSTRAINT "annual_book_days_ath_mobile_nonnegative" CHECK ("annual_book_days"."ath_mobile_cents" >= 0),
	CONSTRAINT "annual_book_days_card_machine_nonnegative" CHECK ("annual_book_days"."card_machine_cents" is null or "annual_book_days"."card_machine_cents" >= 0),
	CONSTRAINT "annual_book_days_notes_not_blank" CHECK ("annual_book_days"."notes" is null or length(trim("annual_book_days"."notes")) > 0)
);
--> statement-breakpoint
ALTER TABLE "report_files" DROP CONSTRAINT "report_files_type_valid";--> statement-breakpoint
ALTER TABLE "annual_book_amounts" ADD CONSTRAINT "annual_book_amounts_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "annual_book_amounts" ADD CONSTRAINT "annual_book_amounts_updated_by_admin_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admin_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "annual_book_amounts" ADD CONSTRAINT "annual_book_amounts_church_day_fk" FOREIGN KEY ("church_id","annual_book_day_id") REFERENCES "public"."annual_book_days"("church_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "annual_book_days" ADD CONSTRAINT "annual_book_days_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "annual_book_days" ADD CONSTRAINT "annual_book_days_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "annual_book_days" ADD CONSTRAINT "annual_book_days_updated_by_admin_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admin_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "annual_book_amounts_day_slot_method_unique" ON "annual_book_amounts" USING btree ("church_id","annual_book_day_id","service_slot","payment_method");--> statement-breakpoint
CREATE INDEX "annual_book_amounts_church_day_idx" ON "annual_book_amounts" USING btree ("church_id","annual_book_day_id");--> statement-breakpoint
CREATE UNIQUE INDEX "annual_book_days_church_date_unique" ON "annual_book_days" USING btree ("church_id","entry_date");--> statement-breakpoint
CREATE INDEX "annual_book_days_church_date_idx" ON "annual_book_days" USING btree ("church_id","entry_date");--> statement-breakpoint
ALTER TABLE "report_files" ADD CONSTRAINT "report_files_type_valid" CHECK ("report_files"."report_type" in ('detailed', 'member_totals', 'payment_methods', 'annual_members', 'annual_book'));--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON annual_book_days TO uckg_runtime;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON annual_book_amounts TO uckg_runtime;--> statement-breakpoint
ALTER TABLE annual_book_days ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE annual_book_days FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY annual_book_days_tenant_isolation ON annual_book_days FOR ALL TO uckg_runtime
USING (church_id = nullif(current_setting('app.current_church_id', true), '')::uuid)
WITH CHECK (church_id = nullif(current_setting('app.current_church_id', true), '')::uuid);--> statement-breakpoint
ALTER TABLE annual_book_amounts ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE annual_book_amounts FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY annual_book_amounts_tenant_isolation ON annual_book_amounts FOR ALL TO uckg_runtime
USING (church_id = nullif(current_setting('app.current_church_id', true), '')::uuid)
WITH CHECK (church_id = nullif(current_setting('app.current_church_id', true), '')::uuid);
