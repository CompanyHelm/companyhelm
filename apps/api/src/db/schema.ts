import { randomUUID } from "node:crypto";
import {
  check,
  pgTable,
  text,
  pgEnum,
  timestamp,
  primaryKey,
  index,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm/sql";

export const modelProviderEnum = pgEnum("model_provider", ["openai"]);


export const companies = pgTable("companies", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  name: text("name").notNull()
});

export const users = pgTable("users", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  first_name: text("first_name").notNull(),
  last_name: text("last_name"),
  email: text("email").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull()
}, (table) => ({
  emailUnique: uniqueIndex("users_email_uidx").on(table.email),
  firstNameLengthCheck: check("users_first_name_length_check", sql`length(${table.first_name}) <= 255`),
  lastNameLengthCheck: check(
    "users_last_name_length_check",
    sql`${table.last_name} IS NULL OR length(${table.last_name}) <= 255`
  )
}));


export const userAuths = pgTable("user_auths", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  user_id: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  email: text("email").notNull(),
  password_salt: text("password_salt").notNull(),
  password_hash: text("password_hash").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull(),
},
(table) => ({
  userIdUnique: uniqueIndex("user_auths_user_id_uidx").on(table.user_id),
  emailUnique: uniqueIndex("user_auths_email_uidx").on(table.email),
}));

export const companyMembers = pgTable("company_members", {
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
},
(table) => ({
  pk: primaryKey({ columns: [table.companyId, table.userId] }),
  companyIdIndex: index("company_members_company_id_idx").on(table.companyId),
  userIdIndex: index("company_members_user_id_idx").on(table.userId),
}));

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
  default_model_name: text("default_model_name").notNull(),
  default_reasoning_level: text("default_reasoning_level"),
  modelApiKeyId: uuid("model_api_key_id")
    .references(() => modelApiKeys.id, { onDelete: "set null" }),
  modelOAuthTokenId: uuid("model_oauth_token_id")
    .references(() => modelOauthTokens.id, { onDelete: "set null" }),
  system_prompt: text("system_prompt"),
},
(table) => ({
  companyIdIndex: index("agents_company_id_idx").on(table.companyId),
  // either api key or oauth token must be present, not both at the same time
  modelApiKeyIdOrOauthTokenIdCheck: check("agents_model_api_key_id_or_oauth_token_id_check",
    sql`(NOT (${table.modelApiKeyId} IS NOT NULL AND ${table.modelOAuthTokenId} IS NOT NULL))`),
}));

export const threads = pgTable("threads", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull(),
},
(table) => ({
  companyIdIndex: index("threads_company_id_idx").on(table.companyId),
}));

export const messages = pgTable("model_provider_credentials", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  modelProvider: modelProviderEnum("model_provider").notNull(),
  apiKey: text("api_key").notNull(),
  oauthToken: text("oauth_token").notNull(),
});

export const modelApiKeys = pgTable("model_api_keys", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  modelProvider: modelProviderEnum("model_provider").notNull(),
  encryptedKey: text("encrypted_key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
},
(table) => ({
  companyIdIndex: index("model_api_keys_company_id_idx").on(table.companyId),
}));

export const modelOauthTokens = pgTable("model_oauth_tokens", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  modelProvider: modelProviderEnum("model_provider").notNull(),
  encryptedRefreshToken: text("encrypted_refresh_token").notNull(),
  encryptedAccessToken: text("encrypted_access_token").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  refreshedAt: timestamp("refreshed_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
},
(table) => ({
  companyIdIndex: index("model_oauth_tokens_company_id_idx").on(table.companyId),
}));
