ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON "users"', policy_record.policyname);
  END LOOP;
END
$$;
--> statement-breakpoint
CREATE POLICY "users_runtime_access_policy"
ON "users"
AS PERMISSIVE
FOR ALL
TO public
USING (true)
WITH CHECK (true);
