import { randomUUID } from "node:crypto";
import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { companies } from "./company.ts";
import { agentSessions } from "./sessions.ts";
import { workflowRuns } from "./workflows.ts";

export const scheduleTypeEnum = pgEnum("schedule_type", [
  "workflow",
  "queued_agent_message",
]);

export const scheduleRunStatusEnum = pgEnum("schedule_run_status", [
  "running",
  "done",
  "skipped",
  "failed",
]);

export const schedules = pgTable("schedules", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  type: scheduleTypeEnum("type").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyIdIndex: index("schedules_company_id_idx").on(table.companyId),
  companyEnabledIndex: index("schedules_company_enabled_idx").on(table.companyId, table.enabled),
}));

export const queuedAgentMessageSchedules = pgTable("queued_agent_message_schedules", {
  scheduleId: uuid("schedule_id")
    .references(() => schedules.id, { onDelete: "cascade" })
    .primaryKey(),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  sessionId: uuid("session_id")
    .references(() => agentSessions.id, { onDelete: "cascade" })
    .notNull(),
  cronPattern: text("cron_pattern").notNull(),
  timezone: text("timezone").notNull(),
  text: text("text").notNull(),
  shouldSteer: boolean("should_steer").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyIdIndex: index("queued_agent_message_schedules_company_id_idx").on(table.companyId),
  sessionIdIndex: index("queued_agent_message_schedules_session_id_idx").on(table.sessionId),
}));

export const scheduleRuns = pgTable("schedule_runs", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  scheduleId: uuid("schedule_id")
    .references(() => schedules.id, { onDelete: "cascade" })
    .notNull(),
  status: scheduleRunStatusEnum("status").notNull().default("running"),
  bullmqJobId: text("bullmq_job_id"),
  workflowRunId: uuid("workflow_run_id")
    .references(() => workflowRuns.id, { onDelete: "set null" }),
  queuedMessageId: uuid("queued_message_id"),
  sessionId: uuid("session_id")
    .references(() => agentSessions.id, { onDelete: "set null" }),
  skippedReason: text("skipped_reason"),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyIdIndex: index("schedule_runs_company_id_idx").on(table.companyId),
  scheduleIdIndex: index("schedule_runs_schedule_id_idx").on(table.scheduleId),
  scheduleStatusIndex: index("schedule_runs_schedule_status_idx").on(table.scheduleId, table.status),
  workflowRunIdIndex: index("schedule_runs_workflow_run_id_idx").on(table.workflowRunId),
  sessionIdIndex: index("schedule_runs_session_id_idx").on(table.sessionId),
}));
