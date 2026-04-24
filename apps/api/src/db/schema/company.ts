import { randomUUID } from "node:crypto";
import {
  bigint,
  integer,
  check,
  index,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  boolean,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm/sql";

export const companySubscriptionPlanEnum = pgEnum("company_subscription_plan", [
  "free",
  "pro",
]);

export const companyDeletionStatusEnum = pgEnum("company_deletion_status", ["active", "deletion_requested"]);
export const companyDeletionRequestStatusEnum = pgEnum("company_deletion_request_status", [
  "requested",
  "processing",
  "completed",
  "failed",
]);

export const companies = pgTable("companies", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  clerkOrganizationId: text("clerk_organization_id"),
  slug: text("slug"),
  deletionStatus: companyDeletionStatusEnum("deletion_status").notNull().default("active"),
  deletionRequestedAt: timestamp("deletion_requested_at", { withTimezone: true }),
  name: text("name").notNull(),
  plan: companySubscriptionPlanEnum("plan").notNull(),
}, (table) => ({
  clerkOrganizationIdUnique: uniqueIndex("companies_clerk_organization_id_uidx").on(table.clerkOrganizationId),
  slugUnique: uniqueIndex("companies_slug_uidx").on(table.slug),
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
  isPlatformAdmin: boolean("is_platform_admin").notNull().default(false),
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

export const companyDeletionRequests = pgTable("company_deletion_requests", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id").notNull(),
  clerkOrganizationId: text("clerk_organization_id"),
  companyName: text("company_name").notNull(),
  requestedByUserId: uuid("requested_by_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  status: companyDeletionRequestStatusEnum("status").notNull().default("requested"),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  lockedBy: text("locked_by"),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyIdIndex: index("company_deletion_requests_company_id_idx").on(table.companyId),
  statusNextAttemptIndex: index("company_deletion_requests_status_next_attempt_idx")
    .on(table.status, table.nextAttemptAt),
  openCompanyUnique: uniqueIndex("company_deletion_requests_company_open_uidx")
    .on(table.companyId)
    .where(sql`${table.status} IN ('requested', 'processing', 'failed')`),
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
  accountLogin: text("account_login"),
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

export const githubRepositoryProvisionings = pgTable("github_repository_provisionings", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  githubRepositoryId: uuid("github_repository_id")
    .references(() => githubRepositories.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyIdIndex: index("github_repository_provisionings_company_id_idx").on(table.companyId),
  githubRepositoryIdIndex: index("github_repository_provisionings_repository_id_idx").on(table.githubRepositoryId),
  uniqueCompanyRepository: uniqueIndex("github_repository_provisionings_company_repository_uidx")
    .on(table.companyId, table.githubRepositoryId),
}));
