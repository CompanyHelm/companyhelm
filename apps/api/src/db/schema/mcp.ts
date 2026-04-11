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
  headers: jsonb("headers").$type<Record<string, string>>().notNull(),
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
