import {
  index,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { agents } from "./agents.ts";
import { companies, users } from "./company.ts";
import { agentSessions } from "./sessions.ts";
import { workflowRuns } from "./workflows.ts";

export const companyOnboardingStatusEnum = pgEnum("company_onboarding_status", [
  "not_started",
  "in_progress",
  "completed",
  "skipped",
]);

export const companyOnboardings = pgTable("company_onboardings", {
  companyId: uuid("company_id")
    .primaryKey()
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  status: companyOnboardingStatusEnum("status").notNull().default("not_started"),
  agentId: uuid("agent_id")
    .references(() => agents.id, { onDelete: "set null" }),
  sessionId: uuid("session_id")
    .references(() => agentSessions.id, { onDelete: "set null" }),
  workflowRunId: uuid("workflow_run_id")
    .references(() => workflowRuns.id, { onDelete: "set null" }),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  skippedAt: timestamp("skipped_at", { withTimezone: true }),
  skippedByUserId: uuid("skipped_by_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  agentIdIndex: index("company_onboardings_agent_id_idx").on(table.agentId),
  sessionIdIndex: index("company_onboardings_session_id_idx").on(table.sessionId),
  statusIndex: index("company_onboardings_status_idx").on(table.status),
  workflowRunIdIndex: index("company_onboardings_workflow_run_id_idx").on(table.workflowRunId),
}));
