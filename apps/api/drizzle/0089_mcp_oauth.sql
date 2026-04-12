ALTER TABLE "mcp_servers" ADD COLUMN IF NOT EXISTS "auth_type" text DEFAULT 'none' NOT NULL;
--> statement-breakpoint
UPDATE "mcp_servers"
SET "auth_type" = CASE
  WHEN "headers" <> '{}'::jsonb THEN 'custom_headers'
  ELSE 'none'
END
WHERE "auth_type" = 'none';
--> statement-breakpoint
CREATE TABLE "mcp_oauth_connections" (
  "id" uuid PRIMARY KEY NOT NULL,
  "company_id" uuid NOT NULL,
  "mcp_server_id" uuid NOT NULL,
  "status" text DEFAULT 'connected' NOT NULL,
  "client_type" text NOT NULL,
  "oauth_client_id" text NOT NULL,
  "oauth_client_secret_encrypted_value" text,
  "oauth_client_secret_encryption_key_id" text,
  "token_endpoint_auth_method" text NOT NULL,
  "resource_indicator" text NOT NULL,
  "resource_metadata_url" text NOT NULL,
  "protected_resource_metadata" jsonb NOT NULL,
  "authorization_server_issuer" text NOT NULL,
  "authorization_server_metadata" jsonb NOT NULL,
  "client_registration_metadata" jsonb,
  "requested_scopes" text[] DEFAULT '{}'::text[] NOT NULL,
  "granted_scopes" text[] DEFAULT '{}'::text[] NOT NULL,
  "token_encrypted_value" text NOT NULL,
  "token_encryption_key_id" text NOT NULL,
  "access_token_expires_at" timestamp with time zone,
  "refreshed_at" timestamp with time zone,
  "last_error" text,
  "created_by_user_id" uuid,
  "updated_by_user_id" uuid,
  "created_at" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcp_oauth_sessions" (
  "id" uuid PRIMARY KEY NOT NULL,
  "company_id" uuid NOT NULL,
  "mcp_server_id" uuid NOT NULL,
  "state" text NOT NULL,
  "client_type" text NOT NULL,
  "oauth_client_id" text NOT NULL,
  "oauth_client_secret_encrypted_value" text,
  "oauth_client_secret_encryption_key_id" text,
  "token_endpoint_auth_method" text NOT NULL,
  "resource_indicator" text NOT NULL,
  "resource_metadata_url" text NOT NULL,
  "protected_resource_metadata" jsonb NOT NULL,
  "authorization_server_issuer" text NOT NULL,
  "authorization_server_metadata" jsonb NOT NULL,
  "client_registration_metadata" jsonb,
  "redirect_uri" text NOT NULL,
  "authorization_url" text NOT NULL,
  "code_verifier" text NOT NULL,
  "code_challenge" text NOT NULL,
  "requested_scopes" text[] DEFAULT '{}'::text[] NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "completed_at" timestamp with time zone,
  "created_by_user_id" uuid,
  "updated_by_user_id" uuid,
  "created_at" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mcp_oauth_connections" ADD CONSTRAINT "mcp_oauth_connections_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mcp_oauth_connections" ADD CONSTRAINT "mcp_oauth_connections_mcp_server_id_mcp_servers_id_fk" FOREIGN KEY ("mcp_server_id") REFERENCES "public"."mcp_servers"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mcp_oauth_connections" ADD CONSTRAINT "mcp_oauth_connections_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mcp_oauth_connections" ADD CONSTRAINT "mcp_oauth_connections_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mcp_oauth_sessions" ADD CONSTRAINT "mcp_oauth_sessions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mcp_oauth_sessions" ADD CONSTRAINT "mcp_oauth_sessions_mcp_server_id_mcp_servers_id_fk" FOREIGN KEY ("mcp_server_id") REFERENCES "public"."mcp_servers"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mcp_oauth_sessions" ADD CONSTRAINT "mcp_oauth_sessions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mcp_oauth_sessions" ADD CONSTRAINT "mcp_oauth_sessions_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "mcp_oauth_connections_company_id_idx" ON "mcp_oauth_connections" USING btree ("company_id");
--> statement-breakpoint
CREATE INDEX "mcp_oauth_connections_mcp_server_id_idx" ON "mcp_oauth_connections" USING btree ("mcp_server_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "mcp_oauth_connections_company_server_uidx" ON "mcp_oauth_connections" USING btree ("company_id", "mcp_server_id");
--> statement-breakpoint
CREATE INDEX "mcp_oauth_sessions_company_id_idx" ON "mcp_oauth_sessions" USING btree ("company_id");
--> statement-breakpoint
CREATE INDEX "mcp_oauth_sessions_mcp_server_id_idx" ON "mcp_oauth_sessions" USING btree ("mcp_server_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "mcp_oauth_sessions_state_uidx" ON "mcp_oauth_sessions" USING btree ("state");
--> statement-breakpoint
ALTER TABLE "mcp_oauth_connections" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'mcp_oauth_connections'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON "mcp_oauth_connections"', policy_record.policyname);
  END LOOP;
END
$$;
--> statement-breakpoint
CREATE POLICY "mcp_oauth_connections_company_scope_policy"
ON "mcp_oauth_connections"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
--> statement-breakpoint
ALTER TABLE "mcp_oauth_sessions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'mcp_oauth_sessions'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON "mcp_oauth_sessions"', policy_record.policyname);
  END LOOP;
END
$$;
--> statement-breakpoint
CREATE POLICY "mcp_oauth_sessions_company_scope_policy"
ON "mcp_oauth_sessions"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
