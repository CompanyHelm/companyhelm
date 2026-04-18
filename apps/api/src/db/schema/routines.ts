import { randomUUID } from "node:crypto";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { agents } from "./agents.ts";
import { companies, users } from "./company.ts";
import { agentSessions } from "./conversations.ts";

export const routineOverlapPolicyEnum = pgEnum("routine_overlap_policy", ["skip"]);
export const routineTriggerTypeEnum = pgEnum("routine_trigger_type", ["cron"]);
export const routineRunSourceEnum = pgEnum("routine_run_source", ["manual", "scheduled"]);
export const routineRunStatusEnum = pgEnum("routine_run_status", [
  "queued",
  "running",
  "prompt_queued",
  "skipped",
  "failed",
]);

export const routines = pgTable("routines", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  instructions: text("instructions").notNull(),
  assignedAgentId: uuid("assigned_agent_id")
    .references(() => agents.id, { onDelete: "cascade" })
    .notNull(),
  sessionId: uuid("session_id")
    .references(() => agentSessions.id, { onDelete: "set null" }),
  enabled: boolean("enabled").notNull().default(true),
  overlapPolicy: routineOverlapPolicyEnum("overlap_policy").notNull().default("skip"),
  createdByUserId: uuid("created_by_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  updatedByUserId: uuid("updated_by_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyIdIndex: index("routines_company_id_idx").on(table.companyId),
  companyAssignedAgentIdIndex: index("routines_company_assigned_agent_id_idx").on(table.companyId, table.assignedAgentId),
  companyEnabledIndex: index("routines_company_enabled_idx").on(table.companyId, table.enabled),
  sessionIdIndex: index("routines_session_id_idx").on(table.sessionId),
}));

export const routineTriggers = pgTable("routine_triggers", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  routineId: uuid("routine_id")
    .references(() => routines.id, { onDelete: "cascade" })
    .notNull(),
  type: routineTriggerTypeEnum("type").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyIdIndex: index("routine_triggers_company_id_idx").on(table.companyId),
  routineIdIndex: index("routine_triggers_routine_id_idx").on(table.routineId),
  companyEnabledIndex: index("routine_triggers_company_enabled_idx").on(table.companyId, table.enabled),
}));

export const routineCronTriggers = pgTable("routine_cron_triggers", {
  triggerId: uuid("trigger_id")
    .references(() => routineTriggers.id, { onDelete: "cascade" })
    .notNull(),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  cronPattern: text("cron_pattern").notNull(),
  timezone: text("timezone").notNull(),
  startAt: timestamp("start_at", { withTimezone: true }),
  endAt: timestamp("end_at", { withTimezone: true }),
  limit: integer("limit"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.triggerId] }),
  companyIdIndex: index("routine_cron_triggers_company_id_idx").on(table.companyId),
  triggerIdUnique: uniqueIndex("routine_cron_triggers_trigger_id_uidx").on(table.triggerId),
}));

export const routineRuns = pgTable("routine_runs", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  routineId: uuid("routine_id")
    .references(() => routines.id, { onDelete: "cascade" })
    .notNull(),
  triggerId: uuid("trigger_id")
    .references(() => routineTriggers.id, { onDelete: "set null" }),
  source: routineRunSourceEnum("source").notNull(),
  status: routineRunStatusEnum("status").notNull(),
  sessionId: uuid("session_id")
    .references(() => agentSessions.id, { onDelete: "set null" }),
  bullmqJobId: text("bullmq_job_id"),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyIdIndex: index("routine_runs_company_id_idx").on(table.companyId),
  routineCreatedAtIndex: index("routine_runs_routine_created_at_idx").on(table.routineId, table.createdAt),
  triggerCreatedAtIndex: index("routine_runs_trigger_created_at_idx").on(table.triggerId, table.createdAt),
  sessionIdIndex: index("routine_runs_session_id_idx").on(table.sessionId),
}));
