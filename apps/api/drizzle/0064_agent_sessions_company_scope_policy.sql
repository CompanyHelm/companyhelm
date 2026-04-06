ALTER TABLE "agent_sessions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agent_sessions'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON "agent_sessions"', policy_record.policyname);
  END LOOP;
END
$$;
--> statement-breakpoint
CREATE POLICY "agent_sessions_company_scope_policy"
ON "agent_sessions"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
