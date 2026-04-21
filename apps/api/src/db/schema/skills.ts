import { randomUUID } from "node:crypto";
import {
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
import { companies, githubRepositories, users } from "./company.ts";
import { agentSessions } from "./conversations.ts";

export const skillSourceTypeEnum = pgEnum("skill_source_type", ["manual", "public_git", "github_installation"]);

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
  /****************** GIT SKILL SOURCE FIELDS ********************/
  sourceType: skillSourceTypeEnum("source_type").notNull().default("manual"),
  repository: text("repository"),
  githubRepositoryId: uuid("github_repository_id")
    .references(() => githubRepositories.id, { onDelete: "cascade" }),
  // where in the repository the skill is located
  skillDirectory: text("skill_directory"),
  branchName: text("branch_name"),
  trackedCommitSha: text("tracked_commit_sha"),
}, (table) => ({
  skillGroupIdIndex: index("skills_skill_group_id_idx").on(table.skillGroupId),
  companyIdIndex: index("skills_company_id_idx").on(table.companyId),
  nameUnique: uniqueIndex("skills_company_id_name_uidx").on(table.companyId, table.name),
  fileBackedSourceCheck: check(
    "skills_file_backed_source_check",
    sql`(
      ${table.sourceType} = 'manual'
      AND nullif(trim(${table.repository}), '') IS NULL
      AND ${table.githubRepositoryId} IS NULL
      AND nullif(trim(${table.skillDirectory}), '') IS NULL
      AND nullif(trim(${table.branchName}), '') IS NULL
      AND nullif(trim(${table.trackedCommitSha}), '') IS NULL
      AND coalesce(cardinality(${table.fileList}), 0) = 0
    ) OR (
      ${table.sourceType} = 'public_git'
      AND nullif(trim(${table.repository}), '') IS NOT NULL
      AND ${table.githubRepositoryId} IS NULL
      AND nullif(trim(${table.skillDirectory}), '') IS NOT NULL
      AND nullif(trim(${table.branchName}), '') IS NOT NULL
      AND nullif(trim(${table.trackedCommitSha}), '') IS NOT NULL
    ) OR (
      ${table.sourceType} = 'github_installation'
      AND nullif(trim(${table.repository}), '') IS NULL
      AND ${table.githubRepositoryId} IS NOT NULL
      AND nullif(trim(${table.skillDirectory}), '') IS NOT NULL
      AND nullif(trim(${table.branchName}), '') IS NOT NULL
      AND nullif(trim(${table.trackedCommitSha}), '') IS NOT NULL
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
    .references(() => skills.id, { onDelete: "cascade" }),
  systemSkillKey: text("system_skill_key"),
  activatedAt: timestamp("activated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyIdIndex: index("agent_session_active_skills_company_id_idx").on(table.companyId),
  sessionIdIndex: index("agent_session_active_skills_session_id_idx").on(table.sessionId),
  skillIdIndex: index("agent_session_active_skills_skill_id_idx").on(table.skillId),
  systemSkillKeyIndex: index("agent_session_active_skills_system_skill_key_idx").on(table.systemSkillKey),
  customSkillUnique: uniqueIndex("agent_session_active_skills_session_skill_uidx")
    .on(table.sessionId, table.skillId)
    .where(sql`${table.skillId} IS NOT NULL`),
  systemSkillUnique: uniqueIndex("agent_session_active_skills_session_system_skill_uidx")
    .on(table.sessionId, table.systemSkillKey)
    .where(sql`${table.systemSkillKey} IS NOT NULL`),
  oneSkillReferenceCheck: check(
    "agent_session_active_skills_one_skill_reference_check",
    sql`num_nonnulls(${table.skillId}, ${table.systemSkillKey}) = 1`,
  ),
}));

export const agentSkills = pgTable("agent_skills", {
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  agentId: uuid("agent_id")
    .references(() => agents.id, { onDelete: "cascade" })
    .notNull(),
  skillId: uuid("skill_id")
    .references(() => skills.id, { onDelete: "cascade" }),
  systemSkillKey: text("system_skill_key"),
  createdByUserId: uuid("created_by_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyIdIndex: index("agent_skills_company_id_idx").on(table.companyId),
  agentIdIndex: index("agent_skills_agent_id_idx").on(table.agentId),
  skillIdIndex: index("agent_skills_skill_id_idx").on(table.skillId),
  systemSkillKeyIndex: index("agent_skills_system_skill_key_idx").on(table.systemSkillKey),
  customSkillUnique: uniqueIndex("agent_skills_agent_skill_uidx")
    .on(table.agentId, table.skillId)
    .where(sql`${table.skillId} IS NOT NULL`),
  systemSkillUnique: uniqueIndex("agent_skills_agent_system_skill_uidx")
    .on(table.agentId, table.systemSkillKey)
    .where(sql`${table.systemSkillKey} IS NOT NULL`),
  oneSkillReferenceCheck: check(
    "agent_skills_one_skill_reference_check",
    sql`num_nonnulls(${table.skillId}, ${table.systemSkillKey}) = 1`,
  ),
}));

export const agentSkillGroups = pgTable("agent_skill_groups", {
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  agentId: uuid("agent_id")
    .references(() => agents.id, { onDelete: "cascade" })
    .notNull(),
  skillGroupId: uuid("skill_group_id")
    .references(() => skill_groups.id, { onDelete: "cascade" }),
  systemSkillGroupKey: text("system_skill_group_key"),
  createdByUserId: uuid("created_by_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyIdIndex: index("agent_skill_groups_company_id_idx").on(table.companyId),
  agentIdIndex: index("agent_skill_groups_agent_id_idx").on(table.agentId),
  skillGroupIdIndex: index("agent_skill_groups_skill_group_id_idx").on(table.skillGroupId),
  systemSkillGroupKeyIndex: index("agent_skill_groups_system_skill_group_key_idx").on(table.systemSkillGroupKey),
  customSkillGroupUnique: uniqueIndex("agent_skill_groups_agent_skill_group_uidx")
    .on(table.agentId, table.skillGroupId)
    .where(sql`${table.skillGroupId} IS NOT NULL`),
  systemSkillGroupUnique: uniqueIndex("agent_skill_groups_agent_system_skill_group_uidx")
    .on(table.agentId, table.systemSkillGroupKey)
    .where(sql`${table.systemSkillGroupKey} IS NOT NULL`),
  oneSkillGroupReferenceCheck: check(
    "agent_skill_groups_one_skill_group_reference_check",
    sql`num_nonnulls(${table.skillGroupId}, ${table.systemSkillGroupKey}) = 1`,
  ),
}));
