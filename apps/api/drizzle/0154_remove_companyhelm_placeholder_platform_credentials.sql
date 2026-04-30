UPDATE "platform_model_provider_credentials"
SET
  "encrypted_api_key" = '',
  "status" = 'error',
  "error_message" = 'CompanyHelm-managed model credentials must be provisioned outside database migrations.',
  "updated_at" = NOW()
WHERE "platform_model_provider_credentials"."model_provider"::text = 'companyhelm'
  AND "platform_model_provider_credentials"."encrypted_api_key" LIKE 'companyhelm-managed-%';
