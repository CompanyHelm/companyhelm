DROP TABLE "user_auths" CASCADE;--> statement-breakpoint
ALTER TABLE "company_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "agents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "threads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "model_provider_credentials" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "company_members_company_scope_policy"
ON "company_members"
FOR ALL
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "agents_company_scope_policy"
ON "agents"
FOR ALL
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "threads_company_scope_policy"
ON "threads"
FOR ALL
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "model_provider_credentials_company_scope_policy"
ON "model_provider_credentials"
FOR ALL
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
