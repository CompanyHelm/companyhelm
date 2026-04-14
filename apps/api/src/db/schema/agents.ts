import { randomUUID } from "node:crypto";
import {
  boolean,
  index,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm/sql";

import { companySecrets, companies, secret_groups, users } from "./company.ts";
import { computeProviderDefinitions } from "./environments.ts";

export const modelProviderEnum = pgEnum("model_provider", ["openai", "anthropic", "openai-codex", "openrouter"]);
export const modelProviderCredentialTypeEnum = pgEnum("model_provider_credential_type", ["api_key", "oauth_token"]);
export const modelProviderCredentialStatusEnum = pgEnum("model_provider_credential_status", ["active", "error"]);

export const agents = pgTable("agents", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  name: text("name").notNull(),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull(),
  defaultModelProviderCredentialModelId: uuid("default_model_provider_credential_model_id")
    .references(() => modelProviderCredentialModels.id, { onDelete: "set null" }),
  defaultComputeProviderDefinitionId: uuid("default_compute_provider_definition_id")
    .references(() => computeProviderDefinitions.id, { onDelete: "restrict" }),
  defaultEnvironmentTemplateId: text("default_environment_template_id").notNull(),
  default_reasoning_level: text("default_reasoning_level"),
  system_prompt: text("system_prompt"),
}, (table) => ({
  companyIdIndex: index("agents_company_id_idx").on(table.companyId),
}));

export const modelProviderCredentials = pgTable("model_provider_credentials", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  modelProvider: modelProviderEnum("model_provider").notNull(),
  type: modelProviderCredentialTypeEnum("model_provider_credential_type").notNull(),
  // this can also be an access token
  encryptedApiKey: text("encrypted_api_key").notNull(),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshedAt: timestamp("refreshed_at", { withTimezone: true }),
  isDefault: boolean("is_default").notNull().default(false),
  status: modelProviderCredentialStatusEnum("status").notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyDefaultUnique: uniqueIndex("model_provider_credentials_company_default_uidx")
    .on(table.companyId)
    .where(sql`${table.isDefault}`),
}));

// avaialbe models based on the model provider credential
export const modelProviderCredentialModels = pgTable("model_provider_credential_models", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  modelProviderCredentialId: uuid("model_provider_credential_id")
    .references(() => modelProviderCredentials.id, { onDelete: "cascade" })
    .notNull(),
  modelId: text("model_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  reasoningSupported: boolean("reasoning_supported").notNull().default(false),
  // null if the model does not support reasoning levels
  reasoningLevels: text("reasoning_levels").array(),
  isDefault: boolean("is_default").notNull().default(false),
}, (table) => ({
  companyIdIndex: index("model_provider_credential_models_company_id_idx").on(table.companyId),
  modelProviderCredentialIdIndex: index("model_provider_credential_models_model_provider_credential_id_idx").on(
    table.modelProviderCredentialId,
  ),
  credentialDefaultUnique: uniqueIndex("model_provider_credential_models_credential_default_uidx")
    .on(table.modelProviderCredentialId)
    .where(sql`${table.isDefault}`),
}));

export const agentDefaultSecrets = pgTable("agent_default_secrets", {
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  agentId: uuid("agent_id")
    .references(() => agents.id, { onDelete: "cascade" })
    .notNull(),
  secretId: uuid("secret_id")
    .references(() => companySecrets.id, { onDelete: "cascade" })
    .notNull(),
  createdByUserId: uuid("created_by_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.agentId, table.secretId] }),
  companyIdIndex: index("agent_default_secrets_company_id_idx").on(table.companyId),
  agentIdIndex: index("agent_default_secrets_agent_id_idx").on(table.agentId),
  secretIdIndex: index("agent_default_secrets_secret_id_idx").on(table.secretId),
}));

export const agentDefaultSecretGroups = pgTable("agent_default_secret_groups", {
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  agentId: uuid("agent_id")
    .references(() => agents.id, { onDelete: "cascade" })
    .notNull(),
  secretGroupId: uuid("secret_group_id")
    .references(() => secret_groups.id, { onDelete: "cascade" })
    .notNull(),
  createdByUserId: uuid("created_by_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.agentId, table.secretGroupId] }),
  companyIdIndex: index("agent_default_secret_groups_company_id_idx").on(table.companyId),
  agentIdIndex: index("agent_default_secret_groups_agent_id_idx").on(table.agentId),
  secretGroupIdIndex: index("agent_default_secret_groups_secret_group_id_idx").on(table.secretGroupId),
}));
