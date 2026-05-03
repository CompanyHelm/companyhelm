import type { SkillRecord } from "./service.ts";
import { SystemCommandCatalog } from "./system_command_catalog.ts";
import { SystemInstructionTemplate } from "./system_instruction_template.ts";

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
  private readonly definitions: SystemSkillDefinition[];
  private readonly instructionTemplate: SystemInstructionTemplate;

  constructor(
    commandCatalog: SystemCommandCatalog = new SystemCommandCatalog(),
    instructionTemplate: SystemInstructionTemplate = new SystemInstructionTemplate(),
  ) {
    this.commandCatalog = commandCatalog;
    this.instructionTemplate = instructionTemplate;
    this.definitions = this.buildDefinitions();
  }

  private buildDefinitions(): SystemSkillDefinition[] {
    return [{
      description: "Read the current agent's persisted session messages through scoped system commands.",
      instructions: this.instructionTemplate.read("access_past_messages.md"),
      key: "access_past_messages",
      name: "Access past messages",
    }, {
      description: "Use when users ask how to use CompanyHelm or what agents can do in the product.",
      instructions: this.instructionTemplate.read("companyhelm_guide.md"),
      key: "companyhelm_guide",
      name: "CompanyHelm guide",
    }, {
      description: "Inspect and manage company skills, skill groups, and Git-backed skill imports through scoped system commands.",
      instructions: this.instructionTemplate.read("manage_skills.md"),
      key: "manage_skills",
      name: "Manage skills",
    }, {
      description: "Inspect and maintain durable workflow definitions through scoped system commands.",
      instructions: this.instructionTemplate.read("manage_workflows.md"),
      key: "manage_workflows",
      name: "Manage workflows",
    }, {
      description: "Discover enabled workflows, start workflow runs, and track workflow run step progress.",
      instructions: this.instructionTemplate.read("execute_workflows.md"),
      key: "execute_workflows",
      name: "Execute workflows",
    }, {
      description: "Inspect, create, and update company agents through scoped system commands.",
      instructions: this.instructionTemplate.read("manage_agents.md"),
      key: "manage_agents",
      name: "Manage agents",
    }, {
      description: "Inspect, create, update, and delete company tasks through scoped system commands.",
      instructions: this.instructionTemplate.read("manage_tasks.md"),
      key: "manage_tasks",
      name: "Manage tasks",
    }, {
      description: "Create, inspect, update, and archive durable artifacts through scoped system commands.",
      instructions: this.instructionTemplate.read("manage_artifacts.md"),
      key: "manage_artifacts",
      name: "Manage artifacts",
    }, {
      description: "List GitHub App installations and start user-driven installation flows through scoped system commands.",
      instructions: this.instructionTemplate.read("manage_github_installations.md"),
      key: "manage_github_installations",
      name: "Manage GitHub installations",
    }, {
      description: "Read company members and agents from the directory through scoped system commands.",
      instructions: this.instructionTemplate.read("company_directory.md"),
      key: "company_directory",
      name: "Company directory",
    }];
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
