CREATE TABLE "mcp_servers" (
  "id" uuid PRIMARY KEY NOT NULL,
  "company_id" uuid NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "url" text NOT NULL,
  "headers" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "call_timeout_ms" integer DEFAULT 30000 NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "created_by_user_id" uuid,
  "updated_by_user_id" uuid,
  "created_at" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_default_mcp_servers" (
  "company_id" uuid NOT NULL,
  "agent_id" uuid NOT NULL,
  "mcp_server_id" uuid NOT NULL,
  "created_by_user_id" uuid,
  "created_at" timestamp with time zone NOT NULL,
  CONSTRAINT "agent_default_mcp_servers_agent_id_mcp_server_id_pk" PRIMARY KEY("agent_id", "mcp_server_id")
);
--> statement-breakpoint
ALTER TABLE "mcp_servers" ADD CONSTRAINT "mcp_servers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_servers" ADD CONSTRAINT "mcp_servers_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_servers" ADD CONSTRAINT "mcp_servers_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_default_mcp_servers" ADD CONSTRAINT "agent_default_mcp_servers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_default_mcp_servers" ADD CONSTRAINT "agent_default_mcp_servers_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_default_mcp_servers" ADD CONSTRAINT "agent_default_mcp_servers_mcp_server_id_mcp_servers_id_fk" FOREIGN KEY ("mcp_server_id") REFERENCES "public"."mcp_servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_default_mcp_servers" ADD CONSTRAINT "agent_default_mcp_servers_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mcp_servers_company_id_idx" ON "mcp_servers" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mcp_servers_company_name_lower_uidx" ON "mcp_servers" USING btree ("company_id", lower("name"));--> statement-breakpoint
CREATE INDEX "agent_default_mcp_servers_company_id_idx" ON "agent_default_mcp_servers" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "agent_default_mcp_servers_agent_id_idx" ON "agent_default_mcp_servers" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "agent_default_mcp_servers_mcp_server_id_idx" ON "agent_default_mcp_servers" USING btree ("mcp_server_id");--> statement-breakpoint
ALTER TABLE "mcp_servers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'mcp_servers'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON "mcp_servers"', policy_record.policyname);
  END LOOP;
END
$$;
--> statement-breakpoint
CREATE POLICY "mcp_servers_company_scope_policy"
ON "mcp_servers"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
--> statement-breakpoint
ALTER TABLE "agent_default_mcp_servers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agent_default_mcp_servers'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON "agent_default_mcp_servers"', policy_record.policyname);
  END LOOP;
END
$$;
--> statement-breakpoint
CREATE POLICY "agent_default_mcp_servers_company_scope_policy"
ON "agent_default_mcp_servers"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
