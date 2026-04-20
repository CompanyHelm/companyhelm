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

  private readonly commandCatalog: SystemCommandCatalog;
  private readonly definitions: SystemSkillDefinition[] = [{
    description: "Create and maintain durable workflow definitions through scoped system commands.",
    instructions: [
      "Use workflow management commands only when the user asks to create or change durable workflow definitions.",
      "Prefer small edits that preserve existing inputs and steps unless the user asks for a broader rewrite.",
      "Read the current workflow before deleting inputs or steps so you can target the correct IDs.",
      "Keep workflow step instructions concrete enough for a later agent session to execute without extra context.",
    ].join("\n"),
    key: "manage_workflows",
    name: "Manage workflows",
  }];

  constructor(commandCatalog: SystemCommandCatalog = new SystemCommandCatalog()) {
    this.commandCatalog = commandCatalog;
  }

  isSystemSkillId(skillId: string): boolean {
    return skillId.startsWith(SystemSkillRegistry.idPrefix);
  }

  getSystemSkillId(systemSkillKey: string): string {
    return `${SystemSkillRegistry.idPrefix}${systemSkillKey}`;
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
      githubBranchName: null,
      githubTrackedCommitSha: null,
      id: this.getSystemSkillId(definition.key),
      instructions: definition.instructions,
      name: definition.name,
      repository: null,
      skillDirectory: null,
      skillGroupId: null,
      skillType: "system",
      systemCommands: this.commandCatalog.listCommandDefinitions(definition.key),
      systemKey: definition.key,
    };
  }
}
