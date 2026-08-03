CREATE TABLE "donations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" uuid NOT NULL,
	"member_id" uuid,
	"amount_cents" integer NOT NULL,
	"received_on" date NOT NULL,
	"notes" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "donations_church_id_id_unique" UNIQUE("church_id","id"),
	CONSTRAINT "donations_amount_positive" CHECK ("donations"."amount_cents" > 0),
	CONSTRAINT "donations_notes_not_blank" CHECK ("donations"."notes" is null or length(trim("donations"."notes")) > 0)
);
--> statement-breakpoint
CREATE TABLE "envelope_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" uuid NOT NULL,
	"donation_id" uuid NOT NULL,
	"original_name" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"storage_key" text NOT NULL,
	"checksum" text NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "envelope_files_size_positive" CHECK ("envelope_files"."size_bytes" > 0)
);
--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_church_member_fk" FOREIGN KEY ("church_id","member_id") REFERENCES "public"."members"("church_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "envelope_files" ADD CONSTRAINT "envelope_files_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "envelope_files" ADD CONSTRAINT "envelope_files_uploaded_by_admin_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."admin_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "envelope_files" ADD CONSTRAINT "envelope_files_church_donation_fk" FOREIGN KEY ("church_id","donation_id") REFERENCES "public"."donations"("church_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "donations_church_received_idx" ON "donations" USING btree ("church_id","received_on");--> statement-breakpoint
CREATE UNIQUE INDEX "envelope_files_donation_unique" ON "envelope_files" USING btree ("church_id","donation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "envelope_files_storage_key_unique" ON "envelope_files" USING btree ("storage_key");--> statement-breakpoint
GRANT SELECT, INSERT ON donations, envelope_files TO uckg_runtime;--> statement-breakpoint
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE donations FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY donations_tenant_isolation ON donations FOR ALL TO uckg_runtime
USING (church_id = NULLIF(current_setting('app.current_church_id', true), '')::uuid)
WITH CHECK (church_id = NULLIF(current_setting('app.current_church_id', true), '')::uuid);--> statement-breakpoint
ALTER TABLE envelope_files ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE envelope_files FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY envelope_files_tenant_isolation ON envelope_files FOR ALL TO uckg_runtime
USING (church_id = NULLIF(current_setting('app.current_church_id', true), '')::uuid)
WITH CHECK (church_id = NULLIF(current_setting('app.current_church_id', true), '')::uuid);
