DROP POLICY IF EXISTS "agents_platform_admin_access_policy" ON "agents";
--> statement-breakpoint
CREATE POLICY "agents_platform_admin_access_policy"
ON "agents"
AS PERMISSIVE
FOR ALL
TO public
USING (current_setting('app.platform_admin_access', true) = 'true')
WITH CHECK (current_setting('app.platform_admin_access', true) = 'true');
--> statement-breakpoint
DROP POLICY IF EXISTS "agent_sessions_platform_admin_access_policy" ON "agent_sessions";
--> statement-breakpoint
CREATE POLICY "agent_sessions_platform_admin_access_policy"
ON "agent_sessions"
AS PERMISSIVE
FOR ALL
TO public
USING (current_setting('app.platform_admin_access', true) = 'true')
WITH CHECK (current_setting('app.platform_admin_access', true) = 'true');
