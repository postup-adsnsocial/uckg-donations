CREATE TYPE "public"."member_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TABLE "members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"email" text,
	"phone" text,
	"status" "member_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "members_full_name_not_blank" CHECK (length(trim("members"."full_name")) > 0),
	CONSTRAINT "members_email_normalized" CHECK ("members"."email" is null or "members"."email" = lower("members"."email")),
	CONSTRAINT "members_phone_e164" CHECK ("members"."phone" is null or "members"."phone" ~ '^\+[1-9][0-9]{7,14}$')
);
--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "members_church_name_idx" ON "members" USING btree ("church_id","full_name");--> statement-breakpoint
CREATE UNIQUE INDEX "members_church_email_unique" ON "members" USING btree ("church_id",lower("email")) WHERE "members"."email" is not null;