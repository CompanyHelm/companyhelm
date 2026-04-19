import { randomUUID } from "node:crypto";
import {
  type AnyPgColumn,
  boolean,
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
import { companies, users } from "./company.ts";
import { agentSessions } from "./conversations.ts";

export const workflowRunStatusEnum = pgEnum("workflow_run_status", [
  "running",
  "completed",
  "canceled",
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

export const workflowRuns = pgTable("workflow_runs", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  workflowDefinitionId: uuid("workflow_definition_id")
    .references(() => workflowDefinitions.id, { onDelete: "set null" }),
  instructions: text("instructions"),
  status: workflowRunStatusEnum("status").notNull().default("running"),
  agentId: uuid("agent_id")
    .references(() => agents.id, { onDelete: "cascade" })
    .notNull(),
  sessionId: uuid("session_id")
    .references(() => agentSessions.id, { onDelete: "cascade" })
    .notNull(),
  // Steps with an ordinal before the running step are considered completed.
  runningStepRunId: uuid("running_step_run_id")
    .references((): AnyPgColumn => workflowStepRuns.id, { onDelete: "set null" }),
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
  parentWorkflowRunIdIndex: index("workflow_runs_parent_workflow_run_id_idx").on(table.parentWorkflowRunId),
  runningStepRunIdIndex: index("workflow_runs_running_step_run_id_idx").on(table.runningStepRunId),
  startedBySessionIdIndex: index("workflow_runs_started_by_session_id_idx").on(table.startedBySessionId),
  sessionIdUnique: uniqueIndex("workflow_runs_session_id_uidx").on(table.sessionId),
  oneStarterCheck: check(
    "workflow_runs_one_starter_check",
    sql`num_nonnulls(${table.startedByUserId}, ${table.startedByAgentId}) <= 1`,
  ),
}));

export const workflowStepRuns = pgTable("workflow_step_runs", {
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
}, (table) => ({
  companyIdIndex: index("workflow_step_runs_company_id_idx").on(table.companyId),
  workflowRunIdIndex: index("workflow_step_runs_workflow_run_id_idx").on(table.workflowRunId),
  ordinalCheck: check("workflow_step_runs_ordinal_check", sql`${table.ordinal} > 0`),
}));
