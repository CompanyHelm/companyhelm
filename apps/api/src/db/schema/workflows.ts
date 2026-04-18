import { randomUUID } from "node:crypto";
import {
  type AnyPgColumn,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  boolean,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm/sql";

import { agents } from "./agents.ts";
import { companies, users } from "./company.ts";
import { agentSessions } from "./conversations.ts";

export const workflowDefinitionStatusEnum = pgEnum("workflow_definition_status", [
  "draft",
  "active",
  "inactive",
  "archived",
]);

export const workflowRunStatusEnum = pgEnum("workflow_run_status", [
  "queued",
  "running",
  "waiting",
  "completed",
  "failed",
  "canceled",
]);

export const workflowStepStatusEnum = pgEnum("workflow_step_status", [
  "pending",
  "running",
  "waiting",
  "completed",
  "failed",
  "skipped",
  "canceled",
]);

export const workflowActorTypeEnum = pgEnum("workflow_actor_type", [
  "user",
  "agent",
  "system",
  "workflow",
]);

export const workflowSignalStatusEnum = pgEnum("workflow_signal_status", [
  "pending",
  "processed",
  "ignored",
  "failed",
]);

export const workflowDefinitions = pgTable("workflow_definitions", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  workflowKey: text("workflow_key").notNull(),
  name: text("name").notNull(),
  description: text("description"),
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
  companyWorkflowKeyUnique: uniqueIndex("workflow_definitions_company_workflow_key_uidx")
    .on(table.companyId, table.workflowKey),
  oneCreatorCheck: check(
    "workflow_definitions_one_creator_check",
    sql`num_nonnulls(${table.createdByUserId}, ${table.createdByAgentId}) <= 1`,
  ),
}));

export const workflowDefinitionVersions = pgTable("workflow_definition_versions", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  workflowDefinitionId: uuid("workflow_definition_id")
    .references(() => workflowDefinitions.id, { onDelete: "cascade" })
    .notNull(),
  versionNo: integer("version_no").notNull(),
  status: workflowDefinitionStatusEnum("status").notNull().default("draft"),
  inputSchema: jsonb("input_schema").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  outputSchema: jsonb("output_schema").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  stateSchema: jsonb("state_schema").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  initialStepId: text("initial_step_id").notNull(),
  definitionJson: jsonb("definition_json").$type<Record<string, unknown>>().notNull(),
  checksum: text("checksum").notNull(),
  createdByUserId: uuid("created_by_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  createdByAgentId: uuid("created_by_agent_id")
    .references(() => agents.id, { onDelete: "set null" }),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyIdIndex: index("workflow_definition_versions_company_id_idx").on(table.companyId),
  workflowDefinitionIdIndex: index("workflow_definition_versions_definition_id_idx").on(table.workflowDefinitionId),
  companyStatusIndex: index("workflow_definition_versions_company_status_idx").on(table.companyId, table.status),
  definitionVersionUnique: uniqueIndex("workflow_definition_versions_definition_version_uidx")
    .on(table.workflowDefinitionId, table.versionNo),
  oneActiveVersionUnique: uniqueIndex("workflow_definition_versions_one_active_uidx")
    .on(table.workflowDefinitionId)
    .where(sql`${table.status} = 'active'`),
  oneCreatorCheck: check(
    "workflow_definition_versions_one_creator_check",
    sql`num_nonnulls(${table.createdByUserId}, ${table.createdByAgentId}) <= 1`,
  ),
  versionNoCheck: check("workflow_definition_versions_version_no_check", sql`${table.versionNo} > 0`),
}));

export const workflowStepDefinitions = pgTable("workflow_step_definitions", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  workflowDefinitionVersionId: uuid("workflow_definition_version_id")
    .references(() => workflowDefinitionVersions.id, { onDelete: "cascade" })
    .notNull(),
  stepId: text("step_id").notNull(),
  name: text("name").notNull(),
  stepType: text("step_type").notNull(),
  ordinal: integer("ordinal").notNull(),
  inputSchema: jsonb("input_schema").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  outputSchema: jsonb("output_schema").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  config: jsonb("config").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  nextStepId: text("next_step_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (table) => ({
  workflowDefinitionVersionIdIndex: index("workflow_step_definitions_definition_version_id_idx")
    .on(table.workflowDefinitionVersionId),
  definitionStepUnique: uniqueIndex("workflow_step_definitions_definition_step_uidx")
    .on(table.workflowDefinitionVersionId, table.stepId),
  definitionOrdinalUnique: uniqueIndex("workflow_step_definitions_definition_ordinal_uidx")
    .on(table.workflowDefinitionVersionId, table.ordinal),
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
    .references(() => workflowDefinitions.id, { onDelete: "restrict" })
    .notNull(),
  workflowDefinitionVersionId: uuid("workflow_definition_version_id")
    .references(() => workflowDefinitionVersions.id, { onDelete: "restrict" })
    .notNull(),
  workflowKey: text("workflow_key").notNull(),
  status: workflowRunStatusEnum("status").notNull().default("queued"),
  agentId: uuid("agent_id")
    .references(() => agents.id, { onDelete: "restrict" })
    .notNull(),
  sessionId: uuid("session_id")
    .references(() => agentSessions.id, { onDelete: "restrict" })
    .notNull(),
  currentStepId: text("current_step_id"),
  inputs: jsonb("inputs").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  state: jsonb("state").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  outputs: jsonb("outputs").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  startedByActorType: workflowActorTypeEnum("started_by_actor_type").notNull(),
  startedByUserId: uuid("started_by_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  startedByAgentId: uuid("started_by_agent_id")
    .references(() => agents.id, { onDelete: "set null" }),
  startedBySessionId: uuid("started_by_session_id")
    .references(() => agentSessions.id, { onDelete: "set null" }),
  parentWorkflowRunId: uuid("parent_workflow_run_id")
    .references((): AnyPgColumn => workflowRuns.id, { onDelete: "set null" }),
  parentStepRunId: uuid("parent_step_run_id")
    .references((): AnyPgColumn => workflowStepRuns.id, { onDelete: "set null" }),
  waitingReason: text("waiting_reason"),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyStatusIndex: index("workflow_runs_company_status_idx").on(table.companyId, table.status),
  companyAgentStatusIndex: index("workflow_runs_company_agent_status_idx").on(table.companyId, table.agentId, table.status),
  workflowDefinitionVersionIdIndex: index("workflow_runs_definition_version_id_idx")
    .on(table.workflowDefinitionVersionId),
  parentWorkflowRunIdIndex: index("workflow_runs_parent_workflow_run_id_idx").on(table.parentWorkflowRunId),
  parentStepRunIdIndex: index("workflow_runs_parent_step_run_id_idx").on(table.parentStepRunId),
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
    .references(() => workflowRuns.id, { onDelete: "cascade" })
    .notNull(),
  workflowDefinitionVersionId: uuid("workflow_definition_version_id")
    .references(() => workflowDefinitionVersions.id, { onDelete: "restrict" })
    .notNull(),
  workflowStepDefinitionId: uuid("workflow_step_definition_id")
    .references(() => workflowStepDefinitions.id, { onDelete: "set null" }),
  stepId: text("step_id").notNull(),
  name: text("name").notNull(),
  stepType: text("step_type").notNull(),
  ordinal: integer("ordinal").notNull(),
  status: workflowStepStatusEnum("status").notNull().default("pending"),
  agentId: uuid("agent_id")
    .references(() => agents.id, { onDelete: "restrict" })
    .notNull(),
  sessionId: uuid("session_id")
    .references(() => agentSessions.id, { onDelete: "restrict" })
    .notNull(),
  attemptNo: integer("attempt_no").notNull().default(1),
  inputs: jsonb("inputs").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  state: jsonb("state").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  outputs: jsonb("outputs").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  childWorkflowRunId: uuid("child_workflow_run_id")
    .references(() => workflowRuns.id, { onDelete: "set null" }),
  waitingReason: text("waiting_reason"),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyIdIndex: index("workflow_step_runs_company_id_idx").on(table.companyId),
  workflowRunStatusIndex: index("workflow_step_runs_workflow_run_status_idx").on(table.workflowRunId, table.status),
  workflowDefinitionVersionIdIndex: index("workflow_step_runs_definition_version_id_idx")
    .on(table.workflowDefinitionVersionId),
  sessionIdIndex: index("workflow_step_runs_session_id_idx").on(table.sessionId),
  childWorkflowRunIdIndex: index("workflow_step_runs_child_workflow_run_id_idx").on(table.childWorkflowRunId),
  workflowStepAttemptUnique: uniqueIndex("workflow_step_runs_workflow_step_attempt_uidx")
    .on(table.workflowRunId, table.stepId, table.attemptNo),
  attemptNoCheck: check("workflow_step_runs_attempt_no_check", sql`${table.attemptNo} > 0`),
  ordinalCheck: check("workflow_step_runs_ordinal_check", sql`${table.ordinal} > 0`),
}));

export const workflowRunSignals = pgTable("workflow_run_signals", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  targetWorkflowRunId: uuid("target_workflow_run_id")
    .references(() => workflowRuns.id, { onDelete: "cascade" })
    .notNull(),
  targetStepRunId: uuid("target_step_run_id")
    .references(() => workflowStepRuns.id, { onDelete: "set null" }),
  sourceWorkflowRunId: uuid("source_workflow_run_id")
    .references(() => workflowRuns.id, { onDelete: "set null" }),
  sourceSessionId: uuid("source_session_id")
    .references(() => agentSessions.id, { onDelete: "set null" }),
  signalType: text("signal_type").notNull(),
  status: workflowSignalStatusEnum("status").notNull().default("pending"),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  availableAt: timestamp("available_at", { withTimezone: true }).notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyIdIndex: index("workflow_run_signals_company_id_idx").on(table.companyId),
  targetWorkflowRunStatusAvailableAtIndex: index("workflow_run_signals_target_run_status_available_at_idx")
    .on(table.targetWorkflowRunId, table.status, table.availableAt),
  targetStepRunIdIndex: index("workflow_run_signals_target_step_run_id_idx").on(table.targetStepRunId),
  sourceWorkflowRunIdIndex: index("workflow_run_signals_source_workflow_run_id_idx").on(table.sourceWorkflowRunId),
}));

export const workflowRunEvents = pgTable("workflow_run_events", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  workflowRunId: uuid("workflow_run_id")
    .references(() => workflowRuns.id, { onDelete: "cascade" })
    .notNull(),
  stepRunId: uuid("step_run_id")
    .references(() => workflowStepRuns.id, { onDelete: "set null" }),
  eventType: text("event_type").notNull(),
  actorType: workflowActorTypeEnum("actor_type"),
  actorUserId: uuid("actor_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  actorAgentId: uuid("actor_agent_id")
    .references(() => agents.id, { onDelete: "set null" }),
  actorSessionId: uuid("actor_session_id")
    .references(() => agentSessions.id, { onDelete: "set null" }),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyIdIndex: index("workflow_run_events_company_id_idx").on(table.companyId),
  workflowRunCreatedAtIndex: index("workflow_run_events_workflow_run_created_at_idx")
    .on(table.workflowRunId, table.createdAt),
  stepRunIdIndex: index("workflow_run_events_step_run_id_idx").on(table.stepRunId),
  oneActorCheck: check(
    "workflow_run_events_one_actor_check",
    sql`num_nonnulls(${table.actorUserId}, ${table.actorAgentId}) <= 1`,
  ),
}));

export const workflowRunRefs = pgTable("workflow_run_refs", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  workflowRunId: uuid("workflow_run_id")
    .references(() => workflowRuns.id, { onDelete: "cascade" })
    .notNull(),
  refType: text("ref_type").notNull(),
  refId: text("ref_id").notNull(),
  source: text("source").notNull().default("input"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (table) => ({
  workflowRunIdIndex: index("workflow_run_refs_workflow_run_id_idx").on(table.workflowRunId),
  companyRefLookupIndex: index("workflow_run_refs_company_ref_lookup_idx")
    .on(table.companyId, table.refType, table.refId),
  workflowRunRefUnique: uniqueIndex("workflow_run_refs_workflow_ref_source_uidx")
    .on(table.workflowRunId, table.refType, table.refId, table.source),
}));
