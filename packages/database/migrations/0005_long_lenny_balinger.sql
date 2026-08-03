CREATE TABLE "report_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"envelope_count" integer NOT NULL,
	"total_cents" integer NOT NULL,
	"storage_key" text NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_files_period_valid" CHECK ("report_files"."start_date" <= "report_files"."end_date"),
	CONSTRAINT "report_files_count_valid" CHECK ("report_files"."envelope_count" >= 0),
	CONSTRAINT "report_files_total_valid" CHECK ("report_files"."total_cents" >= 0)
);
--> statement-breakpoint
ALTER TABLE "report_files" ADD CONSTRAINT "report_files_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_files" ADD CONSTRAINT "report_files_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "report_files_church_created_idx" ON "report_files" USING btree ("church_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "report_files_storage_key_unique" ON "report_files" USING btree ("storage_key");--> statement-breakpoint
GRANT SELECT, INSERT ON report_files TO uckg_runtime;--> statement-breakpoint
ALTER TABLE report_files ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE report_files FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY report_files_tenant_isolation ON report_files FOR ALL TO uckg_runtime
USING (church_id = NULLIF(current_setting('app.current_church_id', true), '')::uuid)
WITH CHECK (church_id = NULLIF(current_setting('app.current_church_id', true), '')::uuid);
