ALTER TABLE "compute_provider_definitions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "e2b_compute_provider_definitions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'compute_provider_definitions'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON "compute_provider_definitions"', policy_record.policyname);
  END LOOP;
END
$$;
--> statement-breakpoint
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'e2b_compute_provider_definitions'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON "e2b_compute_provider_definitions"', policy_record.policyname);
  END LOOP;
END
$$;
--> statement-breakpoint
CREATE POLICY "compute_provider_definitions_company_scope_policy"
ON "compute_provider_definitions"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
--> statement-breakpoint
CREATE POLICY "e2b_compute_provider_definitions_company_scope_policy"
ON "e2b_compute_provider_definitions"
AS PERMISSIVE
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1
    FROM "compute_provider_definitions" AS "cpd"
    WHERE "cpd"."id" = "e2b_compute_provider_definitions"."compute_provider_definition_id"
      AND "cpd"."company_id" = current_setting('app.current_company_id', true)::uuid
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "compute_provider_definitions" AS "cpd"
    WHERE "cpd"."id" = "e2b_compute_provider_definitions"."compute_provider_definition_id"
      AND "cpd"."company_id" = current_setting('app.current_company_id', true)::uuid
  )
);
