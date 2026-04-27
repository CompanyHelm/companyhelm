import { randomUUID } from "node:crypto";
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm/sql";
import { modelProviderCredentialStatusEnum, modelProviderCredentialTypeEnum, modelProviderEnum } from "./agents.ts";
import { users } from "./company.ts";

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
