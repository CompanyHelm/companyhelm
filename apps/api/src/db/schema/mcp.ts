import { randomUUID } from "node:crypto";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm/sql";

import { agents } from "./agents.ts";
import { companies, users } from "./company.ts";

export const mcpServers = pgTable("mcp_servers", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  description: text("description"),
  url: text("url").notNull(),
  authType: text("auth_type").notNull().default("none"),
  headers: jsonb("headers").$type<Record<string, string>>().notNull().default(sql`'{}'::jsonb`),
  callTimeoutMs: integer("call_timeout_ms").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  createdByUserId: uuid("created_by_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  updatedByUserId: uuid("updated_by_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyIdIndex: index("mcp_servers_company_id_idx").on(table.companyId),
  companyNameLowerUnique: uniqueIndex("mcp_servers_company_name_lower_uidx")
    .on(table.companyId, sql`lower(${table.name})`),
}));

export const mcpOauthConnections = pgTable("mcp_oauth_connections", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  mcpServerId: uuid("mcp_server_id")
    .references(() => mcpServers.id, { onDelete: "cascade" })
    .notNull(),
  status: text("status").notNull().default("connected"),
  clientType: text("client_type").notNull(),
  oauthClientId: text("oauth_client_id").notNull(),
  oauthClientSecretEncryptedValue: text("oauth_client_secret_encrypted_value"),
  oauthClientSecretEncryptionKeyId: text("oauth_client_secret_encryption_key_id"),
  tokenEndpointAuthMethod: text("token_endpoint_auth_method").notNull(),
  resourceIndicator: text("resource_indicator").notNull(),
  resourceMetadataUrl: text("resource_metadata_url").notNull(),
  protectedResourceMetadata: jsonb("protected_resource_metadata").$type<Record<string, unknown>>().notNull(),
  authorizationServerIssuer: text("authorization_server_issuer").notNull(),
  authorizationServerMetadata: jsonb("authorization_server_metadata").$type<Record<string, unknown>>().notNull(),
  clientRegistrationMetadata: jsonb("client_registration_metadata").$type<Record<string, unknown> | null>(),
  requestedScopes: text("requested_scopes").array().notNull().default(sql`'{}'::text[]`),
  grantedScopes: text("granted_scopes").array().notNull().default(sql`'{}'::text[]`),
  tokenEncryptedValue: text("token_encrypted_value").notNull(),
  tokenEncryptionKeyId: text("token_encryption_key_id").notNull(),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshedAt: timestamp("refreshed_at", { withTimezone: true }),
  lastError: text("last_error"),
  createdByUserId: uuid("created_by_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  updatedByUserId: uuid("updated_by_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyIdIndex: index("mcp_oauth_connections_company_id_idx").on(table.companyId),
  mcpServerIdIndex: index("mcp_oauth_connections_mcp_server_id_idx").on(table.mcpServerId),
  companyServerUnique: uniqueIndex("mcp_oauth_connections_company_server_uidx")
    .on(table.companyId, table.mcpServerId),
}));

export const mcpOauthSessions = pgTable("mcp_oauth_sessions", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  mcpServerId: uuid("mcp_server_id")
    .references(() => mcpServers.id, { onDelete: "cascade" })
    .notNull(),
  state: text("state").notNull(),
  clientType: text("client_type").notNull(),
  oauthClientId: text("oauth_client_id").notNull(),
  oauthClientSecretEncryptedValue: text("oauth_client_secret_encrypted_value"),
  oauthClientSecretEncryptionKeyId: text("oauth_client_secret_encryption_key_id"),
  tokenEndpointAuthMethod: text("token_endpoint_auth_method").notNull(),
  resourceIndicator: text("resource_indicator").notNull(),
  resourceMetadataUrl: text("resource_metadata_url").notNull(),
  protectedResourceMetadata: jsonb("protected_resource_metadata").$type<Record<string, unknown>>().notNull(),
  authorizationServerIssuer: text("authorization_server_issuer").notNull(),
  authorizationServerMetadata: jsonb("authorization_server_metadata").$type<Record<string, unknown>>().notNull(),
  clientRegistrationMetadata: jsonb("client_registration_metadata").$type<Record<string, unknown> | null>(),
  redirectUri: text("redirect_uri").notNull(),
  authorizationUrl: text("authorization_url").notNull(),
  codeVerifier: text("code_verifier").notNull(),
  codeChallenge: text("code_challenge").notNull(),
  requestedScopes: text("requested_scopes").array().notNull().default(sql`'{}'::text[]`),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdByUserId: uuid("created_by_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  updatedByUserId: uuid("updated_by_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyIdIndex: index("mcp_oauth_sessions_company_id_idx").on(table.companyId),
  mcpServerIdIndex: index("mcp_oauth_sessions_mcp_server_id_idx").on(table.mcpServerId),
  stateUnique: uniqueIndex("mcp_oauth_sessions_state_uidx").on(table.state),
}));

export const agentDefaultMcpServers = pgTable("agent_default_mcp_servers", {
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  agentId: uuid("agent_id")
    .references(() => agents.id, { onDelete: "cascade" })
    .notNull(),
  mcpServerId: uuid("mcp_server_id")
    .references(() => mcpServers.id, { onDelete: "cascade" })
    .notNull(),
  createdByUserId: uuid("created_by_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.agentId, table.mcpServerId] }),
  companyIdIndex: index("agent_default_mcp_servers_company_id_idx").on(table.companyId),
  agentIdIndex: index("agent_default_mcp_servers_agent_id_idx").on(table.agentId),
  mcpServerIdIndex: index("agent_default_mcp_servers_mcp_server_id_idx").on(table.mcpServerId),
}));
