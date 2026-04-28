import { pgEnum } from "drizzle-orm/pg-core";

export const modelProviderEnum = pgEnum("model_provider", [
  "openai",
  "anthropic",
  "openai-codex",
  "openrouter",
  "openai-compatible",
  "google-gemini-cli",
  "companyhelm",
]);
export const modelProviderCredentialTypeEnum = pgEnum("model_provider_credential_type", ["api_key", "oauth_token"]);
export const modelProviderCredentialStatusEnum = pgEnum("model_provider_credential_status", ["active", "error"]);
export const modelCredentialSourceEnum = pgEnum("model_credential_source", ["platform", "user_provided"]);
