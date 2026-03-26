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
  uuid,
  boolean,
  jsonb
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm/sql";

export const modelProviderEnum = pgEnum("model_provider", ["openai", "anthropic", "openai-codex"]);
export const modelProviderCredentialTypeEnum = pgEnum("model_provider_credential_type", ["api_key", "oauth_token"]);
export const sessionMessageRoleEnum = pgEnum("session_message_role", ["user", "assistant", "toolResult"]);
export const messageContentTypeEnum = pgEnum("message_content_type", ["text", "image", "toolCall"]);
export const agentSessionStatusEnum = pgEnum("agent_session_status", ["running", "stopped", "archived"]);


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
  defaultModelProviderCredentialModelId: uuid("default_model_provider_credential_model_id")
    .references(() => modelProviderCredentialModels.id, { onDelete: "set null" }),
  default_reasoning_level: text("default_reasoning_level"),
  system_prompt: text("system_prompt"),
},
(table) => ({
  companyIdIndex: index("agents_company_id_idx").on(table.companyId),
}));

export const agentSessions = pgTable("agent_sessions", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  currentModelId: text("current_model_id").notNull(),
  currentReasoningLevel: text("current_reasoning_level").notNull(),
  status: agentSessionStatusEnum("status").notNull(),
  user_message: text("user_message").notNull(),
  agentId: uuid("agent_id")
    .references(() => agents.id, { onDelete: "cascade" })
    .notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull(),
},
(table) => ({
  companyIdIndex: index("agent_sessions_company_id_idx").on(table.companyId),
}));

export const sessionMessages = pgTable("session_messages", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  sessionId: uuid("session_id")
    .references(() => agentSessions.id, { onDelete: "cascade" })
    .notNull(),
  role: sessionMessageRoleEnum("role").notNull(),
  toolCallId: text("tool_call_id"),
  toolName: text("tool_name"),
  isError: boolean("is_error").notNull(),
  isThinking: boolean("is_thinking").notNull(),
  thinkingText: text("thinking_text"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
},
(table) => ({
  companyIdIndex: index("session_messages_company_id_idx").on(table.companyId),
  sessionIdIndex: index("session_messages_session_id_idx").on(table.sessionId),
}));

export const messageContents = pgTable("message_contents", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  messageId: uuid("message_id")
    .references(() => sessionMessages.id, { onDelete: "cascade" })
    .notNull(),
  type: messageContentTypeEnum("type").notNull(),
  text: text("text"),
  data: text("data"),
  mimeType: text("mime_type"),
  toolCallId: text("tool_call_id"),
  toolName: text("tool_name"),
  arguments: jsonb("arguments"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
},
(table) => ({
  companyIdIndex: index("message_contents_company_id_idx").on(table.companyId),
  sessionIdIndex: index("message_contents_message_id_idx").on(table.messageId),
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
  // null if the model does not support reasoning levels
  reasoningLevels: text("reasoning_levels").array(),
},
(table) => ({
  companyIdIndex: index("model_provider_credential_models_company_id_idx").on(table.companyId),
  modelProviderCredentialIdIndex: index("model_provider_credential_models_model_provider_credential_id_idx").on(table.modelProviderCredentialId),
}));
