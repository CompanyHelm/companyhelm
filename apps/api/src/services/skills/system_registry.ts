import type { SkillRecord } from "./service.ts";
import { SystemCommandCatalog } from "./system_command_catalog.ts";

type SystemSkillDefinition = {
  description: string;
  instructions: string;
  key: string;
  name: string;
};

/**
 * Provides the product-owned skill catalog that is not persisted per company. These records use
 * opaque IDs so callers can list and activate them next to company-created skills without treating
 * them as rows in the `skills` table.
 */
export class SystemSkillRegistry {
  private static readonly idPrefix = "system:";
  static readonly systemSkillGroupId = "system";
  private static readonly systemSkillGroupName = "System";

  private readonly commandCatalog: SystemCommandCatalog;
  private readonly definitions: SystemSkillDefinition[] = [
    {
      description: "Inspect and manage company skills, skill groups, and Git-backed skill imports through scoped system commands.",
      instructions: [
        "Use skill management commands when the user asks to inspect or change the company skill catalog or skill groups.",
        "Call skill.list before updating or deleting skills and groups so you can target the correct IDs.",
        "Use skill.create for manual skills and skill.github.import for repository-backed skills.",
        "Do not try to attach skills to agents with this skill; use the agent management system skill for agent defaults.",
      ].join("\n"),
      key: "manage_skills",
      name: "Manage skills",
    },
    {
      description: "Inspect and maintain durable workflow definitions through scoped system commands.",
      instructions: [
        "Use workflow management commands only when the user asks to inspect or change durable workflow definitions.",
        "Call workflow.list before updating workflows, inputs, or steps so you can target the correct IDs, including disabled workflows.",
        "Prefer small edits that preserve existing inputs and steps unless the user asks for a broader rewrite.",
        "Keep workflow step instructions concrete enough for a later agent session to execute without extra context.",
        "Do not start workflow runs with this skill; use the Execute workflows system skill for workflow execution.",
      ].join("\n"),
      key: "manage_workflows",
      name: "Manage workflows",
    },
    {
      description: "Discover enabled workflows, start workflow runs, and track workflow run step progress.",
      instructions: [
        "Before processing a user request, check workflow.execution.list for enabled workflows that may fit the request.",
        "Start a workflow only when there is a good match for the request; otherwise handle the request normally without a workflow.",
        "Prefer executionMode local when the current agent should execute the workflow in this same session.",
        "Use executionMode agent only when the workflow should be delegated to another agent session, and provide agentId.",
        "After starting a local workflow, follow the returned ordered steps. Mark each step running before working on it and done after completing it.",
      ].join("\n"),
      key: "execute_workflows",
      name: "Execute workflows",
    },
    {
      description: "Inspect, create, and update company agents through scoped system commands.",
      instructions: [
        "Use agent management commands only when the user asks to inspect or change persisted company agent configuration.",
        "Call agent.list before creating or updating agents when you need model, credential, compute provider, template, or secret IDs.",
        "Call agent.skills.list before changing an agent's skill defaults so you can see the current direct skill and skill-group assignments.",
        "Call agent.mcps.list before changing MCP defaults or when you need to inspect the MCP servers attached to one agent.",
        "Only send fields that should change when updating an agent.",
      ].join("\n"),
      key: "manage_agents",
      name: "Manage agents",
    },
    {
      description: "Create, inspect, update, and archive durable artifacts through scoped system commands.",
      instructions: [
        "Use artifact commands when the user asks to manage durable docs, links, pull requests, or other saved deliverables.",
        "List or get existing artifacts before creating duplicates or replacing content.",
        "Choose the narrowest update command for the artifact field that needs to change.",
      ].join("\n"),
      key: "manage_artifacts",
      name: "Manage artifacts",
    },
    {
      description: "Read company members and agents from the directory through scoped system commands.",
      instructions: [
        "Use company directory commands when you need stable company member or agent IDs for follow-up work.",
        "The directory is read-only; use the agent management system skill for persisted agent changes.",
      ].join("\n"),
      key: "company_directory",
      name: "Company directory",
    },
  ];

  constructor(commandCatalog: SystemCommandCatalog = new SystemCommandCatalog()) {
    this.commandCatalog = commandCatalog;
  }

  isSystemSkillId(skillId: string): boolean {
    return skillId.startsWith(SystemSkillRegistry.idPrefix);
  }

  getSystemSkillId(systemSkillKey: string): string {
    return `${SystemSkillRegistry.idPrefix}${systemSkillKey}`;
  }

  getSystemSkillGroup(companyId: string) {
    return {
      companyId,
      id: SystemSkillRegistry.systemSkillGroupId,
      name: SystemSkillRegistry.systemSkillGroupName,
    };
  }

  isSystemSkillGroupId(skillGroupId: string): boolean {
    return skillGroupId === SystemSkillRegistry.systemSkillGroupId;
  }

  parseSystemSkillId(skillId: string): string {
    if (!this.isSystemSkillId(skillId)) {
      throw new Error(`${skillId} is not a system skill ID.`);
    }

    return skillId.slice(SystemSkillRegistry.idPrefix.length);
  }

  listSkills(companyId: string): SkillRecord[] {
    return this.definitions.map((definition) => this.toSkillRecord(companyId, definition));
  }

  requireSkillById(companyId: string, skillId: string): SkillRecord {
    return this.requireSkillByKey(companyId, this.parseSystemSkillId(skillId));
  }

  requireSkillByKey(companyId: string, systemSkillKey: string): SkillRecord {
    const definition = this.definitions.find((candidate) => candidate.key === systemSkillKey);
    if (!definition) {
      throw new Error(`System skill ${systemSkillKey} not found.`);
    }

    return this.toSkillRecord(companyId, definition);
  }

  findSkillByName(companyId: string, skillName: string): SkillRecord | null {
    const definition = this.definitions.find((candidate) => candidate.name === skillName);
    return definition ? this.toSkillRecord(companyId, definition) : null;
  }

  listSkillsByKeys(companyId: string, systemSkillKeys: string[]): SkillRecord[] {
    const uniqueKeys = new Set(systemSkillKeys);
    return this.definitions
      .filter((definition) => uniqueKeys.has(definition.key))
      .map((definition) => this.toSkillRecord(companyId, definition))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  private toSkillRecord(companyId: string, definition: SystemSkillDefinition): SkillRecord {
    return {
      companyId,
      description: definition.description,
      fileList: [],
      branchName: null,
      githubRepositoryId: null,
      githubRepositoryInstallationId: null,
      trackedCommitSha: null,
      id: this.getSystemSkillId(definition.key),
      instructions: definition.instructions,
      name: definition.name,
      repository: null,
      skillDirectory: null,
      skillGroupId: SystemSkillRegistry.systemSkillGroupId,
      sourceType: "manual",
      skillType: "system",
      systemCommands: this.commandCatalog.listCommandDefinitions(definition.key),
      systemKey: definition.key,
    };
  }
}
