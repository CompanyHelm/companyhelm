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
export const modelProviderCredentialTypeEnum = pgEnum("model_provider_credential_type", ["api_key", "oauth_token"]);

export const companies = pgTable("companies", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  clerkOrganizationId: text("clerk_organization_id"),
  name: text("name").notNull()
}, (table) => ({
  clerkOrganizationIdUnique: uniqueIndex("companies_clerk_organization_id_uidx").on(table.clerkOrganizationId),
}));

export const users = pgTable("users", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  clerkUserId: text("clerk_user_id"),
  first_name: text("first_name").notNull(),
  last_name: text("last_name"),
  email: text("email").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull()
}, (table) => ({
  clerkUserIdUnique: uniqueIndex("users_clerk_user_id_uidx").on(table.clerkUserId),
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
  system_prompt: text("system_prompt"),
},
(table) => ({
  companyIdIndex: index("agents_company_id_idx").on(table.companyId),
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
  refreshedAt: timestamp("refreshed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
},
(table) => ({
  companyIdIndex: index("model_provider_credentials_company_id_idx").on(table.companyId),
  oauthRefreshTokenCheck: check(
    "model_provider_credentials_oauth_refresh_token_check",
    sql`${table.type} <> 'oauth_token' OR ${table.refreshToken} IS NOT NULL`,
  ),
}));
