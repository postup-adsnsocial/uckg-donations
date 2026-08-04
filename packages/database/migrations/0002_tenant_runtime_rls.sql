ALTER TABLE "members" ADD CONSTRAINT "members_church_id_id_unique" UNIQUE("church_id","id");--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'uckg_runtime') THEN
		CREATE ROLE uckg_runtime NOSUPERUSER NOCREATEDB NOCREATEROLE NOLOGIN NOREPLICATION NOBYPASSRLS;
	END IF;
END
$$;--> statement-breakpoint
REVOKE CREATE ON SCHEMA public FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO uckg_runtime;--> statement-breakpoint
GRANT SELECT ON churches, admin_users, church_memberships TO uckg_runtime;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON admin_sessions TO uckg_runtime;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON members TO uckg_runtime;--> statement-breakpoint
ALTER TABLE members ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE members FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY members_tenant_isolation
ON members
FOR ALL
TO uckg_runtime
USING (
	church_id = NULLIF(current_setting('app.current_church_id', true), '')::uuid
)
WITH CHECK (
	church_id = NULLIF(current_setting('app.current_church_id', true), '')::uuid
);
