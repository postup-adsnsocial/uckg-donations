ALTER TABLE "church_memberships" ADD COLUMN "status" "admin_user_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
GRANT INSERT, UPDATE ON admin_users, church_memberships TO uckg_runtime;
