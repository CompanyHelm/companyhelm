DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'platform_model_provider_credentials'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON "platform_model_provider_credentials"', policy_record.policyname);
  END LOOP;
END
$$;
--> statement-breakpoint
CREATE POLICY "platform_model_provider_credentials_platform_llm_access_policy"
ON "platform_model_provider_credentials"
AS PERMISSIVE
FOR ALL
TO public
USING (current_setting('app.platform_llm_credential_access', true) = 'true')
WITH CHECK (current_setting('app.platform_llm_credential_access', true) = 'true');
--> statement-breakpoint
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'platform_model_provider_credential_models'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON "platform_model_provider_credential_models"', policy_record.policyname);
  END LOOP;
END
$$;
--> statement-breakpoint
CREATE POLICY "platform_model_provider_credential_models_platform_llm_access_policy"
ON "platform_model_provider_credential_models"
AS PERMISSIVE
FOR ALL
TO public
USING (current_setting('app.platform_llm_credential_access', true) = 'true')
WITH CHECK (current_setting('app.platform_llm_credential_access', true) = 'true');
