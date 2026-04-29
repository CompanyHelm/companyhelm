DROP POLICY IF EXISTS "company_members_platform_admin_access_policy" ON "company_members";
--> statement-breakpoint
CREATE POLICY "company_members_platform_admin_access_policy"
ON "company_members"
AS PERMISSIVE
FOR ALL
TO public
USING (current_setting('app.platform_admin_access', true) = 'true')
WITH CHECK (current_setting('app.platform_admin_access', true) = 'true');
