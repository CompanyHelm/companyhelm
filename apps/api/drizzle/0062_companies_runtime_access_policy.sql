ALTER TABLE "companies" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'companies'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON "companies"', policy_record.policyname);
  END LOOP;
END
$$;
--> statement-breakpoint
CREATE POLICY "companies_runtime_access_policy"
ON "companies"
AS PERMISSIVE
FOR ALL
TO public
USING (true)
WITH CHECK (true);
