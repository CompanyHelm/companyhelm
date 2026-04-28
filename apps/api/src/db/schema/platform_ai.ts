import { randomUUID } from "node:crypto";
import {
  boolean,
  index,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  pgTable,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm/sql";
import { modelProviderCredentialStatusEnum, modelProviderCredentialTypeEnum, modelProviderEnum } from "./ai_common.ts";
import { companies, users } from "./company.ts";

export const platformModelProviderCredentials = pgTable("platform_model_provider_credentials", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  name: text("name").notNull(),
  modelProvider: modelProviderEnum("model_provider").notNull(),
  type: modelProviderCredentialTypeEnum("model_provider_credential_type").notNull(),
  encryptedApiKey: text("encrypted_api_key").notNull(),
  baseUrl: text("base_url"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshedAt: timestamp("refreshed_at", { withTimezone: true }),
  isDefault: boolean("is_default").notNull().default(false),
  status: modelProviderCredentialStatusEnum("status").notNull(),
  errorMessage: text("error_message"),
  createdByUserId: uuid("created_by_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  defaultUnique: uniqueIndex("platform_model_provider_credentials_default_uidx")
    .on(table.isDefault)
    .where(sql`${table.isDefault}`),
  modelProviderIndex: index("platform_model_provider_credentials_model_provider_idx").on(table.modelProvider),
  statusIndex: index("platform_model_provider_credentials_status_idx").on(table.status),
}));

export const platformModelProviderCredentialModels = pgTable("platform_model_provider_credential_models", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  platformModelProviderCredentialId: uuid("platform_model_provider_credential_id")
    .references(() => platformModelProviderCredentials.id, { onDelete: "cascade" })
    .notNull(),
  modelId: text("model_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  reasoningSupported: boolean("reasoning_supported").notNull().default(false),
  reasoningLevels: text("reasoning_levels").array(),
  isDefault: boolean("is_default").notNull().default(false),
  isAvailable: boolean("is_available").notNull().default(true),
  unavailableAt: timestamp("unavailable_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  credentialDefaultUnique: uniqueIndex("platform_model_provider_credential_models_default_uidx")
    .on(table.platformModelProviderCredentialId)
    .where(sql`${table.isDefault}`),
  credentialIndex: index("platform_model_provider_credential_models_credential_idx").on(
    table.platformModelProviderCredentialId,
  ),
  credentialModelUnique: uniqueIndex("platform_model_provider_credential_models_credential_model_uidx")
    .on(table.platformModelProviderCredentialId, table.modelId),
}));

export const platformModels = pgTable("platform_models", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  key: text("key").notNull(),
  modelProvider: modelProviderEnum("model_provider").notNull(),
  modelId: text("model_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  reasoningSupported: boolean("reasoning_supported").notNull().default(false),
  reasoningLevels: text("reasoning_levels").array(),
  isDefault: boolean("is_default").notNull().default(false),
  isAvailable: boolean("is_available").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  defaultUnique: uniqueIndex("platform_models_default_uidx")
    .on(table.isDefault)
    .where(sql`${table.isDefault}`),
  keyUnique: uniqueIndex("platform_models_key_uidx").on(table.key),
  modelProviderIndex: index("platform_models_model_provider_idx").on(table.modelProvider),
}));

export const platformModelRoutes = pgTable("platform_model_routes", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  platformModelId: uuid("platform_model_id")
    .references(() => platformModels.id, { onDelete: "cascade" })
    .notNull(),
  platformModelProviderCredentialModelId: uuid("platform_model_provider_credential_model_id")
    .references(() => platformModelProviderCredentialModels.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  platformModelIndex: index("platform_model_routes_platform_model_idx").on(table.platformModelId),
  credentialModelUnique: uniqueIndex("platform_model_routes_credential_model_uidx")
    .on(table.platformModelId, table.platformModelProviderCredentialModelId),
}));

export const companyManagedModelProviderSettings = pgTable("company_managed_model_provider_settings", {
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  providerKey: text("provider_key").notNull(),
  defaultPlatformModelId: uuid("default_platform_model_id")
    .references(() => platformModels.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.companyId, table.providerKey] }),
  defaultPlatformModelIndex: index("company_managed_model_provider_settings_default_model_idx")
    .on(table.defaultPlatformModelId),
}));
