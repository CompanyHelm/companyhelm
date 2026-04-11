import { randomUUID } from "node:crypto";
import {
  check,
  index,
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

export const skill_groups = pgTable("skill_groups", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
}, (table) => ({
  companyIdIndex: index("skill_groups_company_id_idx").on(table.companyId),
}));

export const skills = pgTable("skills", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  instructions: text("instructions").notNull(),
  // the list of files that are part of the skill, excluding the SKILL.md file
  // a skill folder contains the SKILL.md file and the skill files at the same level
  // includes nested folders and files
  // if the skill has files they will need to instanciated in a enviornment on skill activation
  fileList: text("file_list").array().notNull(),
  skillGroupId: uuid("skill_group_id")
    .references(() => skill_groups.id, { onDelete: "set null" }),
  /****************** GITHUB SKILL FIELDS ********************/
  repository: text("repository"),
  // where in the repository the skill is located
  skillDirectory: text("skill_directory"),
  githubBranchName: text("github_branch_name"),
  githubTrackedCommitSha: text("github_tracked_commit_sha"),
}, (table) => ({
  skillGroupIdIndex: index("skills_skill_group_id_idx").on(table.skillGroupId),
  companyIdIndex: index("skills_company_id_idx").on(table.companyId),
  nameUnique: uniqueIndex("skills_name_uidx").on(table.name),
  fileBackedSourceCheck: check(
    "skills_file_backed_source_check",
    sql`coalesce(cardinality(${table.fileList}), 0) = 0 OR (
      nullif(trim(${table.repository}), '') IS NOT NULL
      AND nullif(trim(${table.skillDirectory}), '') IS NOT NULL
      AND nullif(trim(${table.githubTrackedCommitSha}), '') IS NOT NULL
    )`,
  ),
}));

export const agentSessionActiveSkills = pgTable("agent_session_active_skills", {
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  sessionId: uuid("session_id")
    .references(() => agentSessions.id, { onDelete: "cascade" })
    .notNull(),
  skillId: uuid("skill_id")
    .references(() => skills.id, { onDelete: "cascade" })
    .notNull(),
  activatedAt: timestamp("activated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  pk: primaryKey({
    columns: [table.sessionId, table.skillId],
    name: "agent_session_active_skills_session_id_skill_id_pk",
  }),
  companyIdIndex: index("agent_session_active_skills_company_id_idx").on(table.companyId),
  sessionIdIndex: index("agent_session_active_skills_session_id_idx").on(table.sessionId),
  skillIdIndex: index("agent_session_active_skills_skill_id_idx").on(table.skillId),
}));

export const agentSkills = pgTable("agent_skills", {
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  agentId: uuid("agent_id")
    .references(() => agents.id, { onDelete: "cascade" })
    .notNull(),
  skillId: uuid("skill_id")
    .references(() => skills.id, { onDelete: "cascade" })
    .notNull(),
  createdByUserId: uuid("created_by_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.agentId, table.skillId] }),
  companyIdIndex: index("agent_skills_company_id_idx").on(table.companyId),
  agentIdIndex: index("agent_skills_agent_id_idx").on(table.agentId),
  skillIdIndex: index("agent_skills_skill_id_idx").on(table.skillId),
}));

export const agentSkillGroups = pgTable("agent_skill_groups", {
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  agentId: uuid("agent_id")
    .references(() => agents.id, { onDelete: "cascade" })
    .notNull(),
  skillGroupId: uuid("skill_group_id")
    .references(() => skill_groups.id, { onDelete: "cascade" })
    .notNull(),
  createdByUserId: uuid("created_by_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.agentId, table.skillGroupId] }),
  companyIdIndex: index("agent_skill_groups_company_id_idx").on(table.companyId),
  agentIdIndex: index("agent_skill_groups_agent_id_idx").on(table.agentId),
  skillGroupIdIndex: index("agent_skill_groups_skill_group_id_idx").on(table.skillGroupId),
}));
