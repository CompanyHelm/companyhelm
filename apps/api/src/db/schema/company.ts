import { randomUUID } from "node:crypto";
import {
  bigint,
  check,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  boolean,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm/sql";

export const companies = pgTable("companies", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  clerkOrganizationId: text("clerk_organization_id"),
  name: text("name").notNull(),
}, (table) => ({
  clerkOrganizationIdUnique: uniqueIndex("companies_clerk_organization_id_uidx").on(table.clerkOrganizationId),
}));

export const companySettings = pgTable("company_settings", {
  companyId: uuid("company_id")
    .primaryKey()
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  base_system_prompt: text("base_system_prompt"),
});

export const users = pgTable("users", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  clerkUserId: text("clerk_user_id"),
  first_name: text("first_name").notNull(),
  last_name: text("last_name"),
  email: text("email").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  clerkUserIdUnique: uniqueIndex("users_clerk_user_id_uidx").on(table.clerkUserId),
  emailUnique: uniqueIndex("users_email_uidx").on(table.email),
  firstNameLengthCheck: check("users_first_name_length_check", sql`length(${table.first_name}) <= 255`),
  lastNameLengthCheck: check(
    "users_last_name_length_check",
    sql`${table.last_name} IS NULL OR length(${table.last_name}) <= 255`,
  ),
}));

export const companyMembers = pgTable("company_members", {
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.companyId, table.userId] }),
  companyIdIndex: index("company_members_company_id_idx").on(table.companyId),
  userIdIndex: index("company_members_user_id_idx").on(table.userId),
}));

export const secret_groups = pgTable("secret_groups", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
}, (table) => ({
  companyIdIndex: index("secret_groups_company_id_idx").on(table.companyId),
}));

export const companySecrets = pgTable("company_secrets", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  secretGroupId: uuid("secret_group_id")
    .references(() => secret_groups.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  envVarName: text("env_var_name").notNull(),
  encryptedValue: text("encrypted_value").notNull(),
  encryptionKeyId: text("encryption_key_id").notNull(),
  createdByUserId: uuid("created_by_user_id")
    .references(() => users.id, { onDelete: "restrict" })
    .notNull(),
  updatedByUserId: uuid("updated_by_user_id")
    .references(() => users.id, { onDelete: "restrict" })
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyIdIndex: index("company_secrets_company_id_idx").on(table.companyId),
  secretGroupIdIndex: index("company_secrets_secret_group_id_idx").on(table.secretGroupId),
  companyNameLowerUnique: uniqueIndex("company_secrets_company_name_lower_uidx")
    .on(table.companyId, sql`lower(${table.name})`),
  companyEnvVarLowerUnique: uniqueIndex("company_secrets_company_env_var_lower_uidx")
    .on(table.companyId, sql`lower(${table.envVarName})`),
  envVarNameCheck: check(
    "company_secrets_env_var_name_check",
    sql`${table.envVarName} ~ '^[A-Z_][A-Z0-9_]*$'`,
  ),
}));

export const companyGithubInstallations = pgTable("company_github_installations", {
  installationId: bigint("installation_id", { mode: "number" }).primaryKey(),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyIdIndex: index("company_github_installations_company_id_idx").on(table.companyId),
}));

export const githubRepositories = pgTable("github_repositories", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  installationId: bigint("installation_id", { mode: "number" })
    .references(() => companyGithubInstallations.installationId, { onDelete: "cascade" })
    .notNull(),
  externalId: text("external_id").notNull(),
  name: text("name").notNull(),
  fullName: text("full_name").notNull(),
  htmlUrl: text("html_url"),
  isPrivate: boolean("is_private").notNull(),
  defaultBranch: text("default_branch"),
  archived: boolean("archived").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyIdIndex: index("github_repositories_company_id_idx").on(table.companyId),
  installationIdIndex: index("github_repositories_installation_id_idx").on(table.installationId),
  uniqueInstallationRepository: uniqueIndex("github_repositories_company_installation_external_uidx")
    .on(table.companyId, table.installationId, table.externalId),
}));
