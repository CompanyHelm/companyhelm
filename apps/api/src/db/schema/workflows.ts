import { randomUUID } from "node:crypto";
import {
  type AnyPgColumn,
  boolean,
  check,
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
import { sql } from "drizzle-orm/sql";

import { agents } from "./agents.ts";
import { companies, users } from "./company.ts";
import { agentSessions } from "./conversations.ts";

export const workflowRunStatusEnum = pgEnum("workflow_run_status", [
  "running",
  "done",
  "canceled",
]);

export const workflowRunSourceEnum = pgEnum("workflow_run_source", ["manual", "scheduled"]);
export const workflowTriggerTypeEnum = pgEnum("workflow_trigger_type", ["cron"]);
export const workflowOverlapPolicyEnum = pgEnum("workflow_overlap_policy", ["skip"]);

export const workflowRunStepStatusEnum = pgEnum("workflow_run_step_status", [
  "pending",
  "running",
  "done",
]);

export const workflowDefinitions = pgTable("workflow_definitions", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  description: text("description"),
  instructions_template: text("instructions_template"),
  isEnabled: boolean("is_enabled").notNull().default(true),
  createdByUserId: uuid("created_by_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  createdByAgentId: uuid("created_by_agent_id")
    .references(() => agents.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyIdIndex: index("workflow_definitions_company_id_idx").on(table.companyId),
  companyIsEnabledIndex: index("workflow_definitions_company_is_enabled_idx").on(table.companyId, table.isEnabled),
  oneCreatorCheck: check(
    "workflow_definitions_one_creator_check",
    sql`num_nonnulls(${table.createdByUserId}, ${table.createdByAgentId}) <= 1`,
  ),
}));

export const workflowDefinitionInputs = pgTable("workflow_definition_inputs", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  workflowDefinitionId: uuid("workflow_definition_id")
    .references(() => workflowDefinitions.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isRequired: boolean("is_required").notNull().default(true),
  // all inputs are text, other types are converted to text
  defaultValue: text("default_value"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyIdIndex: index("workflow_definition_inputs_company_id_idx").on(table.companyId),
  workflowDefinitionIdIndex: index("workflow_definition_inputs_definition_id_idx").on(table.workflowDefinitionId),
  definitionInputUnique: uniqueIndex("workflow_definition_inputs_definition_input_uidx")
    .on(table.workflowDefinitionId, table.name),
}));

export const workflowStepDefinitions = pgTable("workflow_step_definitions", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  workflowDefinitionId: uuid("workflow_definition_id")
    .references(() => workflowDefinitions.id, { onDelete: "cascade" })
    .notNull(),
  stepId: text("step_id").notNull(),
  name: text("name").notNull(),
  instructions_template: text("instructions_template"),
  ordinal: integer("ordinal").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (table) => ({
  workflowDefinitionIdIndex: index("workflow_step_definitions_definition_id_idx")
    .on(table.workflowDefinitionId),
  definitionStepUnique: uniqueIndex("workflow_step_definitions_definition_step_uidx")
    .on(table.workflowDefinitionId, table.stepId),
  definitionOrdinalUnique: uniqueIndex("workflow_step_definitions_definition_ordinal_uidx")
    .on(table.workflowDefinitionId, table.ordinal),
  ordinalCheck: check("workflow_step_definitions_ordinal_check", sql`${table.ordinal} > 0`),
}));

export const workflowTriggers = pgTable("workflow_triggers", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  workflowDefinitionId: uuid("workflow_definition_id")
    .references(() => workflowDefinitions.id, { onDelete: "cascade" })
    .notNull(),
  agentId: uuid("agent_id")
    .references(() => agents.id, { onDelete: "cascade" })
    .notNull(),
  type: workflowTriggerTypeEnum("type").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  overlapPolicy: workflowOverlapPolicyEnum("overlap_policy").notNull().default("skip"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyIdIndex: index("workflow_triggers_company_id_idx").on(table.companyId),
  definitionIdIndex: index("workflow_triggers_definition_id_idx").on(table.workflowDefinitionId),
  companyEnabledIndex: index("workflow_triggers_company_enabled_idx").on(table.companyId, table.enabled),
}));

export const workflowCronTriggers = pgTable("workflow_cron_triggers", {
  triggerId: uuid("trigger_id")
    .references(() => workflowTriggers.id, { onDelete: "cascade" })
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
  companyIdIndex: index("workflow_cron_triggers_company_id_idx").on(table.companyId),
  triggerIdUnique: uniqueIndex("workflow_cron_triggers_trigger_id_uidx").on(table.triggerId),
}));

export const workflowTriggerInputValues = pgTable("workflow_trigger_input_values", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  triggerId: uuid("trigger_id")
    .references(() => workflowTriggers.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  value: text("value").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyIdIndex: index("workflow_trigger_input_values_company_id_idx").on(table.companyId),
  triggerIdIndex: index("workflow_trigger_input_values_trigger_id_idx").on(table.triggerId),
  triggerInputUnique: uniqueIndex("workflow_trigger_input_values_trigger_name_uidx").on(table.triggerId, table.name),
}));

export const workflowRuns = pgTable("workflow_runs", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  workflowDefinitionId: uuid("workflow_definition_id")
    .references(() => workflowDefinitions.id, { onDelete: "set null" }),
  triggerId: uuid("trigger_id")
    .references(() => workflowTriggers.id, { onDelete: "set null" }),
  instructions: text("instructions"),
  source: workflowRunSourceEnum("source").notNull().default("manual"),
  status: workflowRunStatusEnum("status").notNull().default("running"),
  agentId: uuid("agent_id")
    .references(() => agents.id, { onDelete: "cascade" })
    .notNull(),
  sessionId: uuid("session_id")
    .references(() => agentSessions.id, { onDelete: "cascade" })
    .notNull(),
  startedByUserId: uuid("started_by_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  startedByAgentId: uuid("started_by_agent_id")
    .references(() => agents.id, { onDelete: "set null" }),
  startedBySessionId: uuid("started_by_session_id")
    .references(() => agentSessions.id, { onDelete: "set null" }),
  parentWorkflowRunId: uuid("parent_workflow_run_id")
    .references((): AnyPgColumn => workflowRuns.id, { onDelete: "set null" }),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyStatusIndex: index("workflow_runs_company_status_idx").on(table.companyId, table.status),
  companyAgentStatusIndex: index("workflow_runs_company_agent_status_idx").on(table.companyId, table.agentId, table.status),
  workflowDefinitionIdIndex: index("workflow_runs_definition_id_idx")
    .on(table.workflowDefinitionId),
  triggerIdIndex: index("workflow_runs_trigger_id_idx").on(table.triggerId),
  parentWorkflowRunIdIndex: index("workflow_runs_parent_workflow_run_id_idx").on(table.parentWorkflowRunId),
  startedBySessionIdIndex: index("workflow_runs_started_by_session_id_idx").on(table.startedBySessionId),
  sessionIdIndex: index("workflow_runs_session_id_idx").on(table.sessionId),
  oneStarterCheck: check(
    "workflow_runs_one_starter_check",
    sql`num_nonnulls(${table.startedByUserId}, ${table.startedByAgentId}) <= 1`,
  ),
}));

export const workflowRunSteps = pgTable("workflow_run_steps", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  workflowRunId: uuid("workflow_run_id")
    .references((): AnyPgColumn => workflowRuns.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  instructions: text("instructions"),
  ordinal: integer("ordinal").notNull(),
  status: workflowRunStepStatusEnum("status").notNull().default("pending"),
}, (table) => ({
  companyIdIndex: index("workflow_run_steps_company_id_idx").on(table.companyId),
  workflowRunIdIndex: index("workflow_run_steps_workflow_run_id_idx").on(table.workflowRunId),
  ordinalCheck: check("workflow_run_steps_ordinal_check", sql`${table.ordinal} > 0`),
}));
