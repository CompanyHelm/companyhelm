import { randomUUID } from "node:crypto";
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm/sql";

import { agents } from "./agents.ts";
import { companies, users } from "./company.ts";
import { agentSessions } from "./conversations.ts";
import { tasks } from "./tasks.ts";

export const artifactScopeEnum = pgEnum("artifact_scope", ["company", "task", "session"]);
export const artifactTypeEnum = pgEnum("artifact_type", ["markdown_document", "external_link", "pull_request"]);
export const artifactStateEnum = pgEnum("artifact_state", ["draft", "active", "archived"]);
export const artifactPullRequestProviderEnum = pgEnum("artifact_pull_request_provider", ["github"]);

export const artifacts = pgTable("artifacts", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  taskId: uuid("task_id")
    .references(() => tasks.id, { onDelete: "cascade" }),
  sessionId: uuid("session_id")
    .references(() => agentSessions.id, { onDelete: "cascade" }),
  scopeType: artifactScopeEnum("scope_type").notNull(),
  type: artifactTypeEnum("type").notNull(),
  state: artifactStateEnum("state").notNull().default("active"),
  name: text("name").notNull(),
  description: text("description"),
  createdByUserId: uuid("created_by_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  createdByAgentId: uuid("created_by_agent_id")
    .references(() => agents.id, { onDelete: "set null" }),
  createdBySessionId: uuid("created_by_session_id")
    .references(() => agentSessions.id, { onDelete: "set null" }),
  updatedByUserId: uuid("updated_by_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  updatedByAgentId: uuid("updated_by_agent_id")
    .references(() => agents.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyIdIndex: index("artifacts_company_id_idx").on(table.companyId),
  companyScopeUpdatedAtIndex: index("artifacts_company_scope_updated_at_idx")
    .on(table.companyId, table.scopeType, table.updatedAt),
  createdBySessionIdIndex: index("artifacts_created_by_session_id_idx").on(table.createdBySessionId),
  sessionIdIndex: index("artifacts_session_id_idx").on(table.sessionId),
  taskIdIndex: index("artifacts_task_id_idx").on(table.taskId),
  scopeTargetCheck: check(
    "artifacts_scope_target_check",
    sql`(${table.scopeType} = 'company' AND ${table.taskId} IS NULL AND ${table.sessionId} IS NULL) OR (${table.scopeType} = 'task' AND ${table.taskId} IS NOT NULL AND ${table.sessionId} IS NULL) OR (${table.scopeType} = 'session' AND ${table.taskId} IS NULL AND ${table.sessionId} IS NOT NULL)`,
  ),
}));

export const artifactMarkdownDocuments = pgTable("artifact_markdown_documents", {
  artifactId: uuid("artifact_id")
    .references(() => artifacts.id, { onDelete: "cascade" })
    .primaryKey(),
  contentMarkdown: text("content_markdown").notNull(),
}, (table) => ({
  artifactIdIndex: index("artifact_markdown_documents_artifact_id_idx").on(table.artifactId),
}));

export const artifactExternalLinks = pgTable("artifact_external_links", {
  artifactId: uuid("artifact_id")
    .references(() => artifacts.id, { onDelete: "cascade" })
    .primaryKey(),
  url: text("url").notNull(),
}, (table) => ({
  artifactIdIndex: index("artifact_external_links_artifact_id_idx").on(table.artifactId),
}));

export const artifactPullRequests = pgTable("artifact_pull_requests", {
  artifactId: uuid("artifact_id")
    .references(() => artifacts.id, { onDelete: "cascade" })
    .primaryKey(),
  provider: artifactPullRequestProviderEnum("provider").notNull().default("github"),
  repository: text("repository"),
  pullRequestNumber: integer("pull_request_number"),
  url: text("url").notNull(),
}, (table) => ({
  artifactIdIndex: index("artifact_pull_requests_artifact_id_idx").on(table.artifactId),
}));
