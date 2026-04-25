import { randomUUID } from "node:crypto";
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm/sql";
import { agents } from "./agents.ts";
import { companies, githubRepositories } from "./company.ts";
import { agentSessions } from "./sessions.ts";

export const githubPullRequestStateEnum = pgEnum("github_pull_request_state", ["open", "closed", "merged"]);

export const githubPullRequests = pgTable("github_pull_requests", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  githubRepositoryId: uuid("github_repository_id")
    .references(() => githubRepositories.id, { onDelete: "cascade" })
    .notNull(),
  externalId: text("external_id").notNull(),
  number: integer("number").notNull(),
  url: text("url").notNull(),
  state: githubPullRequestStateEnum("state").notNull(),
  title: text("title").notNull(),
  ownerSessionId: uuid("owner_session_id")
    .references(() => agentSessions.id, { onDelete: "cascade" }),
  ownerAgentId: uuid("owner_agent_id")
    .references(() => agents.id, { onDelete: "cascade" }),
  createdBySessionId: uuid("created_by_session_id")
    .references(() => agentSessions.id, { onDelete: "set null" }),
  createdByAgentId: uuid("created_by_agent_id")
    .references(() => agents.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyOwnerAgentIdIndex: index("github_pull_requests_company_owner_agent_id_idx")
    .on(table.companyId, table.ownerAgentId),
  companyOwnerSessionIdIndex: index("github_pull_requests_company_owner_session_id_idx")
    .on(table.companyId, table.ownerSessionId),
  repositoryNumberIndex: index("github_pull_requests_repository_number_idx").on(table.githubRepositoryId, table.number),
  uniqueCompanyExternalId: uniqueIndex("github_pull_requests_company_external_id_uidx")
    .on(table.companyId, table.externalId),
  uniqueCompanyRepositoryNumber: uniqueIndex("github_pull_requests_company_repository_number_uidx")
    .on(table.companyId, table.githubRepositoryId, table.number),
  ownerCheck: check(
    "github_pull_requests_owner_check",
    sql`(${table.ownerSessionId} IS NOT NULL AND ${table.ownerAgentId} IS NULL) OR (${table.ownerSessionId} IS NULL AND ${table.ownerAgentId} IS NOT NULL)`,
  ),
}));
