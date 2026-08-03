CREATE TYPE "public"."admin_user_status" AS ENUM('active', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."church_role" AS ENUM('church_admin', 'financial_operator', 'auditor');--> statement-breakpoint
CREATE TYPE "public"."church_status" AS ENUM('active', 'suspended', 'archived');--> statement-breakpoint
CREATE TABLE "admin_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"password_hash" text NOT NULL,
	"is_platform_admin" boolean DEFAULT false NOT NULL,
	"status" "admin_user_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_normalized" CHECK ("admin_users"."email" = lower("admin_users"."email")),
	CONSTRAINT "admin_users_display_name_not_blank" CHECK (length(trim("admin_users"."display_name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "church_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "church_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "churches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"locale" text DEFAULT 'pt-BR' NOT NULL,
	"timezone" text DEFAULT 'America/Sao_Paulo' NOT NULL,
	"status" "church_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "churches_slug_format" CHECK ("churches"."slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
	CONSTRAINT "churches_name_not_blank" CHECK (length(trim("churches"."name")) > 0)
);
--> statement-breakpoint
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_user_id_admin_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_memberships" ADD CONSTRAINT "church_memberships_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_memberships" ADD CONSTRAINT "church_memberships_user_id_admin_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admin_sessions_token_hash_unique" ON "admin_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "admin_sessions_user_idx" ON "admin_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "admin_sessions_expires_at_idx" ON "admin_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_users_email_unique" ON "admin_users" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "church_memberships_church_user_unique" ON "church_memberships" USING btree ("church_id","user_id");--> statement-breakpoint
CREATE INDEX "church_memberships_user_idx" ON "church_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "churches_slug_unique" ON "churches" USING btree ("slug");