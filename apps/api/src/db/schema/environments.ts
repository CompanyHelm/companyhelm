import { randomUUID } from "node:crypto";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm/sql";

import { agents } from "./agents.ts";
import { companies, users } from "./company.ts";
import { agentSessions } from "./conversations.ts";

export const agentEnvironmentPlatformEnum = pgEnum("agent_environment_platform", ["linux", "windows", "macos"]);
export const agentEnvironmentLeaseStateEnum = pgEnum("agent_environment_lease_state", ["active", "idle", "released", "expired"]);
export const computeProviderEnum = pgEnum("compute_provider", ["daytona", "e2b"]);

export const computeProviderDefinitions = pgTable("compute_provider_definitions", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  provider: computeProviderEnum("provider").notNull(),
  description: text("description"),
  isDefault: boolean("is_default").notNull().default(false),
  createdByUserId: uuid("created_by_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  updatedByUserId: uuid("updated_by_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyIdIndex: index("compute_provider_definitions_company_id_idx").on(table.companyId),
  companyProviderIndex: index("compute_provider_definitions_company_provider_idx").on(
    table.companyId,
    table.provider,
  ),
  companyDefaultUnique: uniqueIndex("compute_provider_definitions_company_default_uidx")
    .on(table.companyId)
    .where(sql`${table.isDefault}`),
  companyNameLowerUnique: uniqueIndex("compute_provider_definitions_company_name_lower_uidx")
    .on(table.companyId, sql`lower(${table.name})`),
}));

export const e2bComputeProviderDefinitions = pgTable("e2b_compute_provider_definitions", {
  computeProviderDefinitionId: uuid("compute_provider_definition_id")
    .primaryKey()
    .references(() => computeProviderDefinitions.id, { onDelete: "cascade" }),
  encryptedApiKey: text("encrypted_api_key").notNull(),
  encryptionKeyId: text("encryption_key_id").notNull(),
});

export const daytonaComputeProviderDefinitions = pgTable("daytona_compute_provider_definitions", {
  computeProviderDefinitionId: uuid("compute_provider_definition_id")
    .primaryKey()
    .references(() => computeProviderDefinitions.id, { onDelete: "cascade" }),
  apiUrl: text("api_url").notNull(),
  encryptedApiKey: text("encrypted_api_key").notNull(),
  encryptionKeyId: text("encryption_key_id").notNull(),
}, (table) => ({
  apiUrlIndex: index("daytona_compute_provider_definitions_api_url_idx").on(table.apiUrl),
}));

export const agentEnvironments = pgTable("agent_environments", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  agentId: uuid("agent_id")
    .references(() => agents.id, { onDelete: "cascade" })
    .notNull(),
  provider: computeProviderEnum("provider").notNull(),
  providerDefinitionId: uuid("provider_definition_id")
    .references(() => computeProviderDefinitions.id, { onDelete: "restrict" }),
  providerEnvironmentId: text("provider_environment_id").notNull(),
  templateId: text("template_id").notNull(),
  displayName: text("display_name"),
  platform: agentEnvironmentPlatformEnum("platform").notNull(),
  cpuCount: integer("cpu_count").notNull(),
  memoryGb: integer("memory_gb").notNull(),
  diskSpaceGb: integer("disk_space_gb").notNull(),
  metadata: jsonb("metadata").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
}, (table) => ({
  companyIdIndex: index("agent_environments_company_id_idx").on(table.companyId),
  agentIdIndex: index("agent_environments_agent_id_idx").on(table.agentId),
  providerDefinitionIdIndex: index("agent_environments_provider_definition_id_idx").on(table.providerDefinitionId),
  providerEnvironmentIdIndex: index("agent_environments_provider_environment_id_idx").on(
    table.provider,
    table.providerEnvironmentId,
  ),
}));

export const agentEnvironmentLeases = pgTable("agent_environment_leases", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  environmentId: uuid("environment_id")
    .references(() => agentEnvironments.id, { onDelete: "cascade" })
    .notNull(),
  agentId: uuid("agent_id")
    .references(() => agents.id, { onDelete: "cascade" })
    .notNull(),
  sessionId: uuid("session_id")
    .references(() => agentSessions.id, { onDelete: "cascade" })
    .notNull(),
  state: agentEnvironmentLeaseStateEnum("state").notNull(),
  ownerToken: text("owner_token"),
  acquiredAt: timestamp("acquired_at", { withTimezone: true }).notNull(),
  lastHeartbeatAt: timestamp("last_heartbeat_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  releasedAt: timestamp("released_at", { withTimezone: true }),
  releaseReason: text("release_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyIdIndex: index("agent_environment_leases_company_id_idx").on(table.companyId),
  environmentIdIndex: index("agent_environment_leases_environment_id_idx").on(table.environmentId),
  agentIdIndex: index("agent_environment_leases_agent_id_idx").on(table.agentId),
  sessionIdIndex: index("agent_environment_leases_session_id_idx").on(table.sessionId),
  stateExpiresAtIndex: index("agent_environment_leases_state_expires_at_idx").on(table.state, table.expiresAt),
  openLeaseUnique: uniqueIndex("agent_environment_leases_open_environment_uidx")
    .on(table.environmentId)
    .where(sql`${table.state} in ('active', 'idle')`),
}));
