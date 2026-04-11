import { randomUUID } from "node:crypto";
import {
  type AnyPgColumn,
  check,
  index,
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

export const taskStatusEnum = pgEnum("task_status", ["draft", "in_progress", "completed"]);
export const taskRunStatusEnum = pgEnum("task_run_status", ["queued", "running", "completed", "failed", "canceled"]);

export const taskCategories = pgTable("task_categories", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyIdIndex: index("task_categories_company_id_idx").on(table.companyId),
  companyCreatedAtIndex: index("task_categories_company_created_at_idx").on(table.companyId, table.createdAt),
  companyNameLowerUnique: uniqueIndex("task_categories_company_id_name_lower_uidx")
    .on(table.companyId, sql`lower(${table.name})`),
}));

export const tasks = pgTable("tasks", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  rootTaskId: uuid("root_task_id")
    .references((): AnyPgColumn => tasks.id, { onDelete: "cascade" })
    .notNull(),
  parentTaskId: uuid("parent_task_id")
    .references((): AnyPgColumn => tasks.id, { onDelete: "cascade" }),
  taskCategoryId: uuid("task_category_id")
    .references(() => taskCategories.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  status: taskStatusEnum("status").notNull().default("draft"),
  createdByUserId: uuid("created_by_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  createdByAgentId: uuid("created_by_agent_id")
    .references(() => agents.id, { onDelete: "set null" }),
  assignedUserId: uuid("assigned_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  assignedAgentId: uuid("assigned_agent_id")
    .references(() => agents.id, { onDelete: "set null" }),
  assignedAt: timestamp("assigned_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyIdIndex: index("tasks_company_id_idx").on(table.companyId),
  rootTaskIdIndex: index("tasks_root_task_id_idx").on(table.rootTaskId),
  parentTaskIdIndex: index("tasks_parent_task_id_idx").on(table.parentTaskId),
  companyTaskCategoryIdIndex: index("tasks_company_task_category_id_idx").on(table.companyId, table.taskCategoryId),
  companyAssignedUserIdIndex: index("tasks_company_assigned_user_id_idx").on(table.companyId, table.assignedUserId),
  companyAssignedAgentIdIndex: index("tasks_company_assigned_agent_id_idx").on(table.companyId, table.assignedAgentId),
  companyStatusCreatedAtIndex: index("tasks_company_status_created_at_idx").on(table.companyId, table.status, table.createdAt),
  oneCreatorCheck: check(
    "tasks_one_creator_check",
    sql`num_nonnulls(${table.createdByUserId}, ${table.createdByAgentId}) <= 1`,
  ),
  oneAssigneeCheck: check(
    "tasks_one_assignee_check",
    sql`num_nonnulls(${table.assignedUserId}, ${table.assignedAgentId}) <= 1`,
  ),
}));

export const taskRuns = pgTable("task_runs", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  taskId: uuid("task_id")
    .references(() => tasks.id, { onDelete: "cascade" })
    .notNull(),
  agentId: uuid("agent_id")
    .references(() => agents.id, { onDelete: "restrict" })
    .notNull(),
  sessionId: uuid("session_id")
    .references(() => agentSessions.id, { onDelete: "set null" }),
  status: taskRunStatusEnum("status").notNull().default("queued"),
  createdByUserId: uuid("created_by_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  createdByAgentId: uuid("created_by_agent_id")
    .references(() => agents.id, { onDelete: "set null" }),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull(),
  endedReason: text("ended_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyIdIndex: index("task_runs_company_id_idx").on(table.companyId),
  taskCreatedAtIndex: index("task_runs_task_created_at_idx").on(table.taskId, table.createdAt),
  agentCreatedAtIndex: index("task_runs_agent_created_at_idx").on(table.agentId, table.createdAt),
  sessionIdUnique: uniqueIndex("task_runs_session_id_uidx").on(table.sessionId),
  openTaskRunUnique: uniqueIndex("task_runs_open_task_id_uidx")
    .on(table.taskId)
    .where(sql`${table.finishedAt} IS NULL`),
  oneCreatorCheck: check(
    "task_runs_one_creator_check",
    sql`num_nonnulls(${table.createdByUserId}, ${table.createdByAgentId}) <= 1`,
  ),
}));
